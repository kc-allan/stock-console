# Clinic console writeup

```text
"We run a clinic. Our supplies team needs an internal console to see what stock we hold. They need to search it, filter it by
category, sort it, open an item to see the detail, and correct the stock count when a physical count disagrees with the system.
Most of them are on ward tablets over patchy wifi. Some of them share links to specific items over chat. We are starting with
one clinic but this will roll out to more."
```

Components:
1. **Search**: A search bar that allows users to quickly find items by name or a relevant identifier.
2. **Filter**: A filtering system that enables users to narrow down items by category, stock status or other relevant attributes.
3. **Sort**: Options to sort the inventory list by various criteria such as name, stock count or date added.
4. **Item Detail View**: A detailed view for each item that displays all relevant information, including stock count, category and any other pertinent details.
5. **Stock Count Correction**: A feature that allows users to update the stock count for an item when a physical count disagrees with the system's recorded count.

```text
The console makes use of the DummyJSON API to simulate inventory data. My design should therefore be focused on client-side functionality (possibly working around limitations of the API)
```

Screens:
1. **Inventory List Screen**: Displays a list of all items in the inventory, with search, filter, and sort functionalities.
2. **Item Detail Screen**: Shows detailed information about a selected item, including the option to correct the stock count.
3. TBD
