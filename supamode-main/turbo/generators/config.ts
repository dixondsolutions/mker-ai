import type { PlopTypes } from "@turbo/gen";

import { createPackageGenerator } from "./templates/package/generator";
import { createSetupGenerator } from "./templates/setup/generator";

// List of generators to be registered
const generators = [createPackageGenerator, createSetupGenerator];

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  generators.forEach((gen) => gen(plop));
}
