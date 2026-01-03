# Build Setup Instructions

## Required Dependencies

The library requires the following dependencies to be installed. Run:

```bash
npm install @tabler/icons-react @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-label class-variance-authority clsx tailwind-merge

npm install -D tailwindcss postcss autoprefixer
```

## Project Structure

```
the-datagrid/
├── src/                    # Library source code
│   ├── components/         # shadcn/ui components
│   ├── filters/            # Filter utilities
│   ├── hooks/              # React hooks
│   ├── lib/                # Library utilities (cn function)
│   ├── sorting/            # Sorting utilities
│   ├── utils/              # General utilities
│   ├── ReactDataGrid.tsx   # Main component
│   ├── types.ts            # TypeScript types
│   └── main.ts             # Entry point
├── examples/               # Example/demo application
│   └── src/
│       ├── App.tsx
│       └── main.tsx
└── dist/                   # Build output (generated)
```

## Build Configuration

- **vite.config.ts**: Configured for library build with path aliases
- **tsconfig-build.json**: TypeScript config for building
- **tsconfig.app.json**: TypeScript config with path aliases (`@/*` → `./src/*`)

## Build Commands

```bash
npm run build    # Build the library
npm run dev      # Run dev server (for examples)
```

## Key Features Implemented

1. ✅ shadcn/ui components integrated
2. ✅ Tailwind CSS configured
3. ✅ Modular code structure (utils, hooks, filters, sorting separated)
4. ✅ TypeScript types maintained
5. ✅ Build configuration updated
6. ✅ Path aliases configured (`@/` → `src/`)

## Notes

- The library uses `"use client"` directive for Next.js compatibility
- All shadcn components are included in the `src/components/ui/` directory
- The library exports both default and named exports for ReactDataGrid
- Path aliases require proper configuration in consuming projects
