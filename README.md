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

Sign in with any DummyJSON user, for example `emilys` / `emilyspass`.

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

Only one, and it is optional — see `.env.example`.

| Variable            | Default                 | Purpose                                             |
| ------------------- | ----------------------- | --------------------------------------------------- |
| `VITE_API_BASE_URL` | `https://dummyjson.com` | Point the app at a stub or proxy instead of the API |

The app should run with no additional configuration.

## Section 1: Design

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

3. Unsupported query parameters are ignored by the API. For example in a `/products/search?q=phone&category=smartphones` request, the category filter is ignored by DummyJSON since `category` is not a supported parameter for a search request. Categories are fetched differently on the `/products/categories` endpoint. This means search and the category filter are mutually exclusive in the UI

- The same applies to sorting which only supports a handful of fields that the list can be sorted by e.g `sortBy=title` returns a sorted list while `sortBy=meta.createdAt` returns an unsorted list despite both being a `200` response and both being valid fields in the payload.

HM:

- `sortBy` is applied across the whole result set before pagination, so page one's highest price sits below page two's lowest. So sorting can be left to the server and stays correct across all pages.

These endpoints were tested with Postman to first have an idea of what the API structure looks like and to verify that what is claimed by the docs is actually how the API behaves.

### Components and how I divided the screen up

1. **Signin**: A sign in form that authenticates a user so all operations are gated
1. **Search**: A search bar that allows users to find items by name or a relevant identifier.
1. **Filter**: A filtering system that enables users to narrow down items by category, stock status or other relevant attributes.
1. **Sort**: Options to sort the inventory list by selected criteria such as name, stock count or date added.
1. **Item Detail View**: A detailed view for each item that displays all relevant information, including stock count, category and any other pertinent details.
1. **Stock Count Correction**: A feature that allows users to update the stock count for an item when a physical count disagrees with the system's recorded count.

Screens:

1. **Inventory List Screen**: Displays a list of all items in the inventory, with search, filter, and sort functionalities.
2. **Item Detail Screen**: Shows detailed information about a selected item, including the option to correct the stock count.
3. **Sign-in screen**: Provides a sign in form for users to authenticate into the application

### Where each piece of state lives

#### URL state

The URL handles the main query. The search term, category, sort field, sort direction and page number states live in the query string and are not copied into component state. This allows share links to persist the same view for all users and a reloading the page also does not lose someone's place. To avoid breaking the page however when a parameter is truncated or hand-typed, the meaning of a URL is parsed and validated by a helper function.

#### Server state

This handles dynamic data where the source of truth is the server i.e the stock catalogue, categories and item details. Their state on the application is managed by TanStack Query and can't also be copied into component state. Components instead read them from cache. The query key is what contains every input to the request and is derived from the URL state parameters.

#### Local UI state

Local state will be whatever is has not be committed yet e.g text from the search input. The URL should describe a search that the user has settled on instead of each keystroke, which is why it is important to have a local state that first handles it
Local state also keeps track of auth status and current user's context

Auth tokens are in a different module of its own instead React state because the fetch wrapper runs outside the component tree and cannot read a React hook from a different component

### How I fetch, cache and invalidate data

TanStack Query is populated by the same parameters that are in the URL. Data from categories are cached with a long lived stale time because they barely change while the stock list is briefly cached

- Since a slow reply from a query that a user has already moved on from should never reach the screen we achieve this by ensuring the search term is part of the query key that is sent out with on a request. If a user changes their search term in the middle of a query. The initial query is aborted by the AbortController and a new request is sent with the new search term

- If a request hangs on a slow connection. Instead of leaving a request open indefinitely, which would leave a spinner up forever, requests time out and give an error with a retry.

- We should also retry only when the request never reached the server. If the server answers, say with a 404 or 500, that answer is what the user needs to see, instead of retrying

- When updating an item, the API only returns the updated payload and does not stored it. We therefore write this response to the cache since refetching would return the old data, undo the users update (the user will be given notice of this behaviour on the UI)

### Layout, spacing, colour and typography

The project uses tailwind, with its default scale for spacing, type and neutrals. I've only added two theme tokens i.e a brand accent, and a minimum control height of 44px for touch devices to be reliably tappable.

No component library was also used.

The list is a single column of cards rather than a table. A table may be better on a desktop, would be considered eventually, but it needs a second layout for narrow screens. So since the requirements target tablet users mostly, this layout scales upwards and was therefore better trade off.

### Accessibility

`eslint-plugin-jsx-a11y` runs in the lint step, so obvious accessibility mistakes fail the build.

Three things worth considering:

- Result counts are displayed on a live region, so someone not looking at the screen knows a filter did something.
- Validation errors are shown and move focus back to the field. The submit button is disabled only while the request is processing and not due to invalid inputs.
- Focus moves to the heading when the item detail opens, so keyboard users get a signal that the page changed.

## Decision Log

1. **Building against the `/auth/products` endpoint instead of the `/products`**
   The requirements document lists the public product endpoints that work without and auth token supplied. I, however, went with its mirror alternative which requires and auth token to successfully fetch products or otherwise throws a 401 error. The **alternative** was that a user would sign in, the app holds a token and then fetches products with a token that never gets checked making auth decorative instead of actually functional.
   **Reason I chose to go against this** is because the apps behaviour when a token expires would have to be simulated rather than actually getting a trigger from the API

2. **Refresh the token by reactiong to a 401**
   The token's expiry is readable from the JWT, so I could schedule a refresh just before it lapses and avoid every expiry needing a failed request and a retry which on a slow connection can be actual overhead. I decided to keep it simple and make it reactive since it involves a fewer moving parts and it also handles the cases a timer does not i.e a suspended tab or a clock that is wrong. This way the behaviour is also provable since expiry happens constantly with a one-minute token.

3. **Search and category are mutually exclusive**
   The search endpoint ignores a category parameter, so the two cannot be combined in a request. The workaround I opted for is to let one win i.e clear the category when a search is typed and disabled whichever control is inactive stating a reason on the UI, with a way to clear the other.

4. **Writing the save response into the cache instead of invalidating**
   The convention after a successful mutation is to invalidate the query and refetch. Here that is won't really work since the API returns the updated object but does not store it, so the refetch returns the old count and the update will be undone when this data updates the UI. Instead I write the response into the cache and the detail view and any cached list page then give notice to the user that the demo API will not keep the change, a reload will overwrite it. The app is briefly more optimistic than the server.
