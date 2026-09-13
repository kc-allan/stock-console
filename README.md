# Clinic Stock Console

An internal console for a clinic's supplies team: search the stock catalogue, filter it by
category, sort it, open an item, and correct the recorded count when a physical count
disagrees with it.

- **Live URL:** https://stock-console.kiruiallan.me
- **Deployment branch:** `master`
- **Backend:** [DummyJSON](https://dummyjson.com) mock API for the stock catalogue

---

## Running it locally

```bash
pnpm install
pnpm dev            # http://localhost:5173
```

- Sign in with any DummyJSON user, for example `emilys` / `emilyspass`.
- Add `?delay=2000` to the URL to simulate a slow connection.

### Scripts

| Script              | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `pnpm dev`          | Vite dev server                                |
| `pnpm build`        | Type-check the project references, then build  |
| `pnpm preview`      | Serve the production build locally             |
| `pnpm test`         | Vitest in watch mode                           |
| `pnpm test:run`     | Vitest once (what CI runs)                     |
| `pnpm lint`         | ESLint                                         |
| `pnpm lint:fix`     | ESLint with `--fix`                            |
| `pnpm format:check` | Fail if any file is unformatted (what CI runs) |
| `pnpm format`       | Rewrite files with Prettier                    |
| `pnpm typecheck`    | `tsc -b` over the project references           |

### Environment variables

See `.env.example`.

| Variable            | Default                 | Purpose                                             |
| ------------------- | ----------------------- | --------------------------------------------------- |
| `VITE_API_BASE_URL` | `https://dummyjson.com` | Point the app at a stub or proxy instead of the API |

The app should run with no additional configuration.

## Deployment and CI/CD

The app is a static bundle. It is built in CI and served from a VPS behind nginx at
**https://stock-console.kiruiallan.me**. A merge into **`master`** deploys it; nothing else
does. The pipeline is a single GitHub Actions workflow,
[`.github/workflows/ci.yml`](.github/workflows/ci.yml), with three jobs.

### What runs, and when

| Job               | Runs on                                    | What it does                                                                                         |
| ----------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `checks`          | every pull request, every push to `master` | `format:check` → `lint` → `typecheck` → `test:run` → `build`, on the Node version pinned in `.nvmrc` |
| `commit-messages` | pull requests only                         | `commitlint` over every commit in the pull request's range                                           |
| `deploy`          | pushes to `master`, only after `checks`    | builds, ships the bundle to the VPS, then checks that the site answers                               |

`commit-messages` is a separate job because the check needs a base and a head to compare, and
that range only exists on a pull request. The same check runs locally on `commit-msg` via husky,
so a malformed message is normally caught before it is ever pushed; the CI job is there for the
case where hooks were skipped.

Two details in the workflow worth naming. Installs use `--frozen-lockfile`, so a lockfile that
has drifted from `package.json` fails the run rather than quietly resolving to versions nobody
tested. And `HUSKY=0` is set for the whole workflow: git hooks belong to a working copy, CI runs
the same checks directly, and installing them there would only add a way for the run to fail for
its own reasons.

### Which checks can block a merge

These are required status checks on `master`. A pull request cannot be merged while any of them
is red:

- **Formatting**: `prettier --check .`
- **Linting**: `eslint .`, including the `jsx-a11y` accessibility ruleset
- **Types**: `tsc -b`
- **Tests**: `vitest run`
- **Commit messages**: `commitlint` over the pull request's commits

`build` runs in the same job as the first four, so a broken import or a type error that only
surfaces in a production build fails the pull request rather than failing a deploy later.

### How a deploy works

`deploy` is gated on `needs: checks`, which is the one line that stops a broken build reaching
the box. It then:

1. builds the bundle in CI rather than on the server;
2. `rsync`s it into a new `releases/<commit-sha>/` directory;
3. repoints the `current` symlink at that directory with an atomic `mv -T`, so no request is ever
   served out of a directory that is still being copied into;
4. prunes all but the five most recent releases, so a rollback is repointing one symlink;
5. requests the homepage **and** `/items/5`. The SPA fallback is the piece most likely to be
   missing, so it is checked directly rather than assumed from the homepage working.

Server setup including the deploy user, the release layout, the nginx config and TLS are documented in
[`deploy/README.md`](deploy/README.md).

### What happens when something fails

- **A check fails on a pull request**: the merge is blocked and nothing deploys.
- **`checks` fails on a push to `master`**: `deploy` is skipped and the previous release stays
  live.
- **The deploy fails before the symlink swap**: the swap is the last thing to happen, so the
  previous release is still being served.
- **The post-deploy request fails**: the job goes red with the new release already live. This is
  the one case that needs a person: rolling back is repointing `current` at the previous release
  directory.

## Design

```text
We run a clinic. Our supplies team needs an internal console to see what stock we hold. They need to search it, filter it by category, sort it, open an item to see the detail, and correct the stock count when a physical count disagrees with the system. Most of them are on ward tablets over patchy wifi. Some of them share links to specific items over chat. We are starting with one clinic but this will roll out to more."
```

### Takeways from the scenario and requirements:

1. The console focuses solely on the client-side (a dummy backend has been provided by dummyjson.com)
2. Features include: auth, search, filter, sort, item detail view and stock correction
3. The system may run on patchy wifi. We therefore need to factor this in both in how we handle the request (can be slow, fail or hang middwa) and in how user experience is affected
4. Shared links should persist the state shared by the sender e.g category selected or the sort order given by the sender.
5. Scaling to more clinics should be considered
6. Nothing should be available to the user until they sign in. Tokens are deliberately short-lived (expires in 1 min) to allow monitoring of the behaviour during the session.

### DummyJSON API

From reading the docs provided by dummy json a few things stand out:

1. Endpoints prepended with "/auth/" simulate requests by logged-in users .i.e /products returns 200 with or without an auth token while /auth/products returns a 401 without an auth token. I have therefore preferred the /auth/\*\* endpoints to effectively simulate how token expiry affects requests across different endpoints

2. DummyJSON is a public API therefore persisting state such as corrected stock count is not done server-side i.e updating stock with the PUT method on /products/<id> returns the updated stock number but a follow-up request on the product returns the original stock number. For this, instead of invalidating the query after a successful update, I would write the server's response into the cache to maintain the illusion of an update (this is clearly stated to the user on the UI)

3. Unsupported query parameters are ignored by the API. For example in a `/products/search?q=phone&category=smartphones` request, the category filter is ignored by DummyJSON since `category` is not a supported parameter for a search request. Categories are fetched differently on the `/products/categories` endpoint. The app,therefore, designs around it this and makes the search request to the server returns every item from the catalogue, and the category filter is applied to those results in the browser. This is a compromise I was willing to take since the API returns only 194 items and provides better UX.On a real system this would however not be recommended

- The same applies to sorting which only supports a handful of fields that the list can be sorted by e.g `sortBy=title` returns a sorted list while `sortBy=meta.createdAt` returns an unsorted list despite both being a `200` response and both being valid fields in the payload.

**NB**:- `sortBy` is applied across the whole result set before pagination, so page one's highest price sits below page two's lowest. So sorting is left to the server, the whole sorted result is fetched and paginated on the browser.

These endpoints were tested with Postman to first have an idea of what the API structure looks like and to verify that what is claimed by the docs is actually how the API behaves.

### Components and how I divided the screen up

1. **Signin**: A sign in form that authenticates a user so all operations are gated
1. **Search**: A search bar that allows users to find items by name or a relevant identifier.
1. **Filter**: Narrows the list, or a search, to a single category.
1. **Sort**: Options to sort the inventory list by selected criteria such as name or stock count.
1. **Item Detail View**: A detailed view for each item that displays all relevant information, including stock count, category and any other pertinent details.
1. **Stock Count Correction**: A feature that allows users to update the stock count for an item when a physical count disagrees with the system's recorded count.

Screens:

1. **Inventory List Screen**: Displays a list of all items in the inventory, with search, filter, and sort functionalities.
2. **Item Detail Screen**: Shows detailed information about a selected item, including the option to correct the stock count.
3. **Sign-in screen**: Provides a sign in form for users to authenticate into the application

### Where each piece of state lives

#### URL state

The URL handles the main query. The search term, category, sort field, sort direction and page number states live in the query string and are not copied into component state. This allows shared links to persist the same view for all users and reloading the page also does not lose someone's place. To avoid breaking the page however when a parameter is truncated or hand-typed, the meaning of a URL is parsed and validated by a helper function to always produce a valid query object.

#### Server state

This handles dynamic data where the source of truth is the server i.e the stock catalogue, categories and item details. Their state on the application is managed by TanStack Query and can't also be copied into component state. Components instead read them from cache. The query key holds the search term and the sort, which is what is sent to the server. Category and page also live in the URL, but they are applied in the browser, so they are not part of the key.

#### Local UI state

Local state will be whatever is has not be committed yet e.g text from the search input. The URL should describe a search that the user has settled on instead of each keystroke, which is why it is important to have a local state that first handles it
Local state also keeps track of auth status and current user's context

Auth tokens are in a different module of its own instead React state because the fetch wrapper runs outside the component tree and cannot read a React hook from a different component

### How I fetch, cache and invalidate data

The server searches and sorts while the browser filters by category and paginates. A search returns every match in one request, since the whole catalogue is 194 items and quite of a small payload to bear. Changing the category or the page reuses what is already loaded, so only a new search or a new sort goes back to the network. Categories are cached with a long-lived stale time because they barely change, while the stock list is cached briefly.

- A slow reply to a search the user has already replaced must never reach the screen. Debouncing the input doesn't necessarily achieve this since it only cuts how many requests go out. What guarantees it is that the search term is part of the key the result is cached under. That key never leaves the browser so a reply for "phone" is filed under "phone" while the list is reading the entry for "phones", so the stale result has nowhere to render. Superseded requests are also aborted, but that only saves work, the key is what makes it correct.

- If a request hangs on a slow connection. Instead of leaving a request open indefinitely, which would leave a spinner up forever, requests time out and give an error with a retry.

- We should also retry only when the request never reached the server. If the server answers, say with a 404 or 500, that answer is what the user needs to see, instead of retrying

- When updating an item, the API only returns the updated payload and does not stored it. We therefore write this response to the cache since refetching would return the old data, undo the users update (the user will be given notice of this behaviour on the UI)

### Layout, spacing, colour and typography

The project uses tailwind, with its default scale for spacing, type and neutrals. I've only added two theme tokens i.e a brand accent, and a minimum control height of 44px for touch devices to be reliably tappable.

No component library was also used.

The list is a single column of cards rather than a table. A table may be better on a desktop, would be considered eventually, but it needs a second layout for narrow screens. So since the requirements target tablet users mostly, this layout scales upwards and was therefore better trade off.

### Accessibility

I've set up `eslint-plugin-jsx-a11y` to run in the lint step, so we are able to catch obvious accessibility mistakes and fail the build early.

Three things worth considering:

- Result counts are displayed on a live region pn the screen. Someone not looking at the screen knows a filter did something.
- Validation errors are shown and move focus back to the field. The submit button is disabled only while the request is processing and not due to invalid inputs.
- Focus moves to the heading when the item detail opens, so keyboard users get a signal that the page changed.

## Decision Log

1. **Building against the `/auth/products` endpoint instead of the `/products`**
   The requirements document lists the public product endpoints that work without and auth token supplied. I, however, went with its mirror alternative which requires and auth token to successfully fetch products or otherwise throws a 401 error. The **alternative** was that a user would sign in, the app holds a token and then fetches products with a token that never gets checked making auth decorative instead of actually functional.
   **Reason I chose to go against this** is because the apps behaviour when a token expires would have to be simulated rather than actually getting a trigger from the API

2. **Refresh the token by reactiong to a 401**
   The token's expiry is readable from the JWT, so I could schedule a refresh just before it lapses and avoid every expiry needing a failed request and a retry which on a slow connection can be actual overhead. I decided to keep it simple and make it reactive since it involves a fewer moving parts and it also handles the cases a timer does not i.e a suspended tab or a clock that is wrong. This way the behaviour is also provable since expiry happens constantly with a one-minute token.

3. **Search on the server, narrow by category in the browser**
   The search endpoint ignores a category parameter, so the two cannot be combined in one request. I had first made them mutually exclusive, disabling whichever control was inactive. I dropped this and considered making a search return every match instead, in one request, then the category filter and pagination are applied to that result in the browser. The **alternative** I rejected was fetching all 194 items and running search in the browser too. It is simpler, but search would otherwise never touch the network, which beats the point of having the API as a source of truth and would assume a fixed number of items.

4. **Writing the save response into the cache instead of invalidating**
   The convention after a successful mutation is to invalidate the query and refetch. Here that is won't really work since the API returns the updated object but does not store it, so the refetch returns the old count and the update will be undone when this data updates the UI. Instead I write the response into the cache and the detail view and any cached list page then give notice to the user that the demo API will not keep the change, a reload will overwrite it. The app is briefly more optimistic than the server.

## AI Usage & Reflection

#### Section 1: Design

I wrote the initial design docs and notes before getting into implementation, including the main screens and component structure. I then used AI to pressure-test the design and identify areas that needed more explicit decisions, particularly state ownership, data fetching, accessibility, and API limitations.

Reviewing DummyJSON's documentation and testing the API directly with Postman helped identify discrepancies between the documented behaviour and actual responses, which informed design decisions around authentication, search, filtering and how to handle mutation.

#### Section 2: Build

I used Claude as the main assistant. I directed the architecture and made the key engineering decisions, while AI was used for scaffolding, debugging and exploring implementation alternatives. AI also help with scaffolding tests but I was keen to not give it context on the codebase and only prompted it to test against specific behaviours to avoid "over-fitting" (for lack of a better word).

A significant part of the workflow was verifying the DummyJSON API directly before relying on assumptions on assumptions I had made, one of which was my intial reliance on that root /products endpoint as suggested by the requirements but later chose to use the "/auth/products" alternative to simulate better session management.

#### Section 3: Deployment and CI/CD

Majority of the deployment and CI/CD work was done by me taking config from previous projects I've done and only tweaking slightly to fit this project. AI however suggested adding a README to explain the deployment process and a guide on how to set up a generic environment of the VPS for anyone who might want to recreate the setup.

#### Section 4: Reflection

This reflection was written by me as well. I used AI to help organise the factual record of my development process especially since my intial brainstorming was scribbled notes I had on the side. Otherwise the reflection and judgments are my own.

### Workflow and tools.

My general workflow was:

1. Inspect the repository and assessment requirements.
2. Probe the external API where behaviour was important to the design.
3. Make design decisions on what was required.
4. Implement the solution per feature i.e auth, stock listing then stock management then circled back to do the search, sort and filter functionalities.
5. Review and test each feature before committing it.
6. Use AI to challenge assumptions and investigate alternatives rather than accepting generated code without review.

### An AI suggestion that improved the work

As I was implementing the stock listing feature, AI noted that since the API doesn't persist stock corrections, the stock availability status being checked against the live API would be misleading i.e an item corrected from 0 to 50 would show "Out of Stock" even though it has been corrected.

The plausible solution therefore was to check stock against the stock count in the cache and display the status based on that instead.

### An AI output that was incorrect or incomplete

While implementing the search and filtering functionality,AI initially suggested building a mutex between search and category since the API doesn't handle category filtering in one search request. The suggestion initiall sounded plausible and I actually built on since it actually is for this problem

I however reviewed this implementation and concluded it would be better to just fetch the entire catalogue and filter by category on the client-side. This avoids UX friction and actually makes the tools of the trade (searching and filtering) actually intuitive for any new staff. I admit it is not a scalable solution but for this use-case it is a trade-off worth considering

### Two decisions I made without AI

**1. Deploying to my own VPS**

I chose to deploy the application to my own Linux VPS rather than relying solely on a managed frontend deployment platform. This gave me direct control over the production environment and allowed me to demonstrate the deployment and release process I've used for majority of my projects. I kept a managed platform as a second target anyway, so the main server being down does not compromise the site's availability (`vercel.json`) holds the SPA rewrite that needs.

**2. Requiring review before commits**

I deliberately structured the workflow so I could review any generated or assisted changes before committing to it.This allowed me to inspect the application's behaviour and debate it before settling on it

### Part of the codebase I would find hardest to defend

The most technical part of the authentication request layer, particularly the single-flight token refresh mechanism. I actually do understand the mechanism of it, but it is also the area where I would expect to be questioned during the review.

The important part is that multiple requests receiving an authentication failure should not independently start refresh operations. They should share one refresh attempt and then retry appropriately.

### Time spent

| Section                       | Time           |
| ----------------------------- | -------------- |
| Section 1: Design             | 1 hour 30 mins |
| Section 2: Build              | 5 hours        |
| Section 3: Deployment & CI/CD | 30 minutes     |
| Section 4: Reflection         | 20 minutes     |
