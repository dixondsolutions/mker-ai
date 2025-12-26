# create-supamode-app

Create a new Supamode application with one command.

## Usage

```bash
# Interactive mode
npx create-supamode-app

# With project name
npx create-supamode-app my-admin-app

# With options
npx create-supamode-app my-admin-app --no-git --no-install
```

## Options

- `--template, -t`: Template to use (default: 'default')
- `--git`: Initialize git repository (default: true)
- `--install`: Install dependencies (default: true)
- `--help, -h`: Show help
- `--version, -v`: Show version

## What it does

1. Clones the Supamode repository
2. Installs dependencies with `pnpm`
3. Updates package.json with your project name
