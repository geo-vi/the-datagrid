# Using the-datagrid in Your Project

## Installing from GitHub Packages

### Setup (One-time)

1. Create a GitHub Personal Access Token (PAT) with `read:packages` permission:

   - Go to https://github.com/settings/tokens
   - Generate new token (classic) with `read:packages` scope
   - Copy the token

2. Configure npm/yarn to use GitHub Packages:

   **For npm**, create/edit `~/.npmrc`:

   ```
   @geo-vi:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
   ```

   **For yarn**, create/edit `~/.yarnrc.yml`:

   ```yaml
   npmScopes:
     geo-vi:
       npmRegistryServer: "https://npm.pkg.github.com"
       npmAuthToken: "YOUR_GITHUB_TOKEN"
   ```

### Installing the Preview Version

In your project's `package.json`:

```json
{
  "dependencies": {
    "@geo-vi/the-datagrid": "preview"
  }
}
```

Then install:

```bash
yarn install
# or
npm install
```

**This will always install the latest preview version** published to GitHub Packages.

## Updating to Latest Preview

Every time you run `yarn install` or `npm install`, it will automatically get the latest preview version if you're using the `preview` tag.

To manually update:

```bash
# With yarn
yarn upgrade @geo-vi/the-datagrid@preview

# With npm
npm install @geo-vi/the-datagrid@preview
```

## How Preview Versions Work

- Every commit to `main`/`master` automatically publishes a new preview version to GitHub Packages
- Version format: `0.0.0-preview.YYYYMMDDHHMMSS.SHORT_SHA`
- Example: `0.0.0-preview.20240103123456.abc1234`
- All preview versions are published with the `preview` npm dist-tag

## Publishing to npm (Manual)

To publish a release version to npm, run:

```bash
yarn publish-release
# or
npm run publish-release
```

This will:

1. Build the package
2. Publish to npm with the `latest` tag

Make sure you have:

- An npm account
- An npm access token set up
- The `NPM_TOKEN` environment variable set, or configured in `~/.npmrc`

## Using in Your Code

```tsx
import { ReactDataGrid } from "@geo-vi/the-datagrid";
import type {
  TypeColumns,
  TypeRowSelection,
  TypeOnSelectionChangeArg,
} from "@geo-vi/the-datagrid";

function MyComponent() {
  const [selected, setSelected] = useState<TypeRowSelection>({});
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [filterValue, setFilterValue] = useState(null);

  const columns: TypeColumns = [
    { name: "clmboxnr", header: "ID", sortable: true, filterable: true },
    { name: "name", header: "Name", sortable: true, filterable: true },
  ];

  const rows = [
    { clmboxnr: 1, name: "John Doe" },
    { clmboxnr: 2, name: "Jane Smith" },
  ];

  const onSelectionChange = (config: TypeOnSelectionChangeArg) => {
    setSelected(config.selected);
  };

  const useGridTheme = () => "default";

  return (
    <ReactDataGrid
      theme={useGridTheme()}
      idProperty="clmboxnr"
      columns={columns}
      columnOrder={columns.map((c) => c.name || "")}
      dataSource={rows}
      enableColumnFilterContextMenu={true}
      enableColumnAutosize={true}
      skipHeaderOnAutoSize={false}
      enableFiltering={true}
      defaultFilterValue={filterValue}
      filteredRowsCount={(count) => console.log("Filtered:", count)}
      onColumnOrderChange={setColumnOrder}
      virtualized={true}
      columnUserSelect={true}
      i18n={{ noRecords: "No records" }}
      showColumnMenuTool={false}
      checkboxColumn={true}
      onSelectionChange={onSelectionChange}
      selected={selected}
    />
  );
}
```

## Alternative: Pin to Specific Preview Version

If you want to pin to a specific preview version:

```json
{
  "dependencies": {
    "@geo-vi/the-datagrid": "0.0.0-preview.20240103123456.abc1234"
  }
}
```

But using `"preview"` is recommended as it always gets the latest.

## Installing from npm (After Manual Release)

Once a release version is published to npm, you can install it directly:

```json
{
  "dependencies": {
    "the-datagrid": "^1.0.0"
  }
}
```

Then:

```bash
yarn install
# or
npm install
```
