# Setting up Publishing

## GitHub Packages (Automatic)

Preview versions are automatically published to GitHub Packages on every commit to `main`/`master`. No setup required!

The workflow uses `GITHUB_TOKEN` automatically, so it works out of the box.

The package is published as `@geo-vi/the-datagrid` to GitHub Packages.

## npm Publishing (Manual)

To publish release versions to npm, you need to set up npm authentication:

### Prerequisites

1. Create an npm account at https://www.npmjs.com/signup
2. Create an npm access token:
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Click "Generate New Token"
   - Choose "Automation" type (for CI/CD)
   - Copy the token

### Local Setup

#### Option 1: Environment Variable (Recommended)

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
export NPM_TOKEN=your_npm_token_here
```

Then run:
```bash
source ~/.zshrc  # or source ~/.bashrc
```

#### Option 2: npm Login

Run:
```bash
npm login
```

This will prompt for your npm credentials and store them securely.

#### Option 3: .npmrc File

Create/edit `~/.npmrc`:

```
//registry.npmjs.org/:_authToken=your_npm_token_here
```

### Publishing a Release

Once set up, simply run:

```bash
yarn publish-release
# or
npm run publish-release
```

This will:
1. Build the package (`npm run build`)
2. Publish to npm with the `latest` tag
3. Use the version from `package.json`

### Version Management

Before publishing, make sure to update the version in `package.json`:

```bash
npm version patch   # 0.0.0 -> 0.0.1
npm version minor   # 0.0.0 -> 0.1.0
npm version major   # 0.0.0 -> 1.0.0
```

Or manually edit `package.json` and set the version.

## How It Works

### Preview Versions (Automatic)

Every commit to `main`/`master` branch will:
1. Generate a preview version: `0.0.0-preview.YYYYMMDDHHMMSS.SHORT_SHA`
2. Build the package
3. Publish to GitHub Packages as `@geo-vi/the-datagrid` with the `preview` tag
4. Update package.json and commit the version change

### Release Versions (Manual)

To publish a release version to npm:
1. Update version in `package.json` (or use `npm version`)
2. Run `yarn publish-release`
3. The package will be published to npm as `the-datagrid` with the `latest` tag

## GitHub Packages vs npm

- **GitHub Packages**: Automatic preview versions on every commit (as `@geo-vi/the-datagrid`)
- **npm**: Manual release versions when you run `yarn publish-release` (as `the-datagrid`)
