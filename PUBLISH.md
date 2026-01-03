# Publishing to npm

## Prerequisites

1. Make sure you have an npm account
2. Login to npm: `npm login`
3. Ensure the package name is available on npm (or use a scoped package like `@your-username/the-datagrid`)

## Steps to Publish

1. **Update version in package.json** (if needed):
   ```bash
   npm version patch  # for bug fixes
   npm version minor  # for new features
   npm version major  # for breaking changes
   ```

2. **Build the package**:
   ```bash
   npm run build
   ```

3. **Verify the build output**:
   ```bash
   # Check that dist/ contains:
   # - index.js (main entry)
   # - main.d.ts (types)
   # - All necessary files
   ls -la dist/
   ```

4. **Test the package locally** (optional but recommended):
   ```bash
   npm pack
   # This creates a .tgz file you can install locally to test
   ```

5. **Publish to npm**:
   ```bash
   npm publish
   # Or for scoped packages:
   npm publish --access public
   ```

## After Publishing

Users can install with:
```bash
npm install the-datagrid
```

And use it like:
```tsx
import { ReactDataGrid } from 'the-datagrid'
import type { TypeColumns, TypeRowSelection } from 'the-datagrid'
```

## Important Notes

- The package requires users to set up Tailwind CSS in their project
- All peer dependencies (React, React DOM) must be installed by the user
- The package uses shadcn/ui components which require Tailwind CSS configuration
- See README.md for full setup instructions
