import { SupamodeSeedGenerator } from './generator';

/**
 * Get the seed data for the given argument
 * @param arg - The argument to get the seed data for
 * @returns The seed data
 */
export async function createSeed(
  arg: string,
  options: {
    rootAccountId: string | undefined;
  },
): Promise<SupamodeSeedGenerator> {
  if (arg === 'custom' || !arg) {
    try {
      const seed = await import(`./templates/custom-seed`);

      const instance = seed.default(options);

      validateSeed(instance);

      return instance;
    } catch (error) {
      console.error(`Error loading custom seed: ${error}`);

      process.exit(1);
    }
  }

  try {
    const seed = await import(`./templates/${arg}-seed`);

    const instance = seed.default(options);

    validateSeed(instance);

    return instance;
  } catch (error) {
    console.error(`Error loading seed: ${error}`);

    process.exit(1);
  }
}

function validateSeed(seed: unknown) {
  // validate the seed
  if (!(seed instanceof SupamodeSeedGenerator)) {
    throw new Error('Seed file must return a SupamodeSeedGenerator instance');
  }
}
