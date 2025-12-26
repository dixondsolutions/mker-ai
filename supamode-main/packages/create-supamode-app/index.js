#!/usr/bin/env node

const { execSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const { readFileSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { program } = require("commander");
const prompts = require("prompts");

const REPO_URL = "git@github.com:makerkit/supamode.git";

async function main() {
  const { default: chalk } = await import("chalk");
  console.log(chalk.cyan.bold("\n🚀 Create Supamode App\n"));

  program
    .name("create-supamode-app")
    .description("Create a new Supamode application with one command")
    .version("0.1.0")
    .argument("[project-name]", "Name of the project directory")
    .option("-t, --template <template>", "Template to use", "default")
    .option("--no-install", "Skip dependency installation")
    .action(async (projectName, options) => {
      await createApp(projectName, options, chalk);
    });

  program.parse();
}

async function createApp(projectName, options, chalk) {
  if (!projectName) {
    const response = await prompts({
      type: "text",
      name: "projectName",
      message: "What is your project named?",
      initial: "supamode",
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return "Project name is required";
        }
        if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
          return "Project name can only contain letters, numbers, hyphens, and underscores";
        }
        return true;
      },
    });

    if (!response.projectName) {
      console.log(chalk.red("❌ Project creation cancelled"));
      process.exit(1);
    }

    projectName = response.projectName;
  }

  const projectPath = resolve(process.cwd(), projectName);

  if (existsSync(projectPath)) {
    console.log(chalk.red(`❌ Directory "${projectName}" already exists`));
    process.exit(1);
  }

  try {
    await createProject(projectPath, projectName, options, chalk);
    console.log(chalk.green(`✅ Successfully created ${projectName}!`));
    console.log(chalk.cyan(`\nNext steps:`));
    console.log(`  cd ${projectName}`);
    if (!options.install) {
      console.log(`  pnpm install`);
      console.log(`  pnpm turbo gen setup`);
    }
    console.log(chalk.cyan(`\nHappy coding! 🎉`));
  } catch (error) {
    console.error(chalk.red(`❌ Failed to create project: ${error.message}`));
    process.exit(1);
  }
}

async function createProject(projectPath, projectName, options, chalk) {
  console.log(chalk.cyan(`📦 Cloning Supamode template...`));

  try {
    // Clone the repository with git history
    execSync(`git clone ${REPO_URL} "${projectPath}"`, { stdio: "inherit" });
    console.log(chalk.green(`✅ Repository cloned successfully`));
  } catch (error) {
    throw new Error(`Failed to clone repository: ${error.message}`);
  }

  // Change to project directory
  process.chdir(projectPath);

  // Update package.json name
  console.log(chalk.cyan(`🔧 Updating package.json...`));
  const packageJsonPath = join(projectPath, "package.json");
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
      packageJson.name = projectName;
      writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log(chalk.green(`✅ Package.json updated`));
    } catch (error) {
      console.log(
        chalk.yellow(`⚠️  Could not update package.json: ${error.message}`)
      );
    }
  }

  // Install dependencies if requested
  if (options.install) {
    console.log(chalk.cyan(`📦 Installing dependencies...`));
    try {
      execSync("pnpm install", { stdio: "inherit" });
      console.log(chalk.green(`✅ Dependencies installed`));

      console.log(chalk.cyan(`🔧 Setting up repository...`));
      execSync("pnpm turbo gen setup", { stdio: "inherit" });
      console.log(chalk.green(`✅ Repository setup complete`));
    } catch (error) {
      console.log(
        chalk.yellow(
          `⚠️  Failed to install dependencies or setup: ${error.message}`
        )
      );
      console.log(
        chalk.yellow(
          `   You can run manually with: pnpm install && pnpm turbo gen setup`
        )
      );
    }
  }

  // Git repository already exists with history - no need to initialize
  console.log(chalk.green(`✅ Git repository with history preserved`));
}

main().catch(async (error) => {
  const { default: chalk } = await import("chalk");
  console.error(chalk.red(`❌ Unexpected error: ${error.message}`));
  process.exit(1);
});
