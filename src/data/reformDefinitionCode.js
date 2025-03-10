import { optimiseHousehold } from "../api/variables";
import { defaultYear } from "./constants";

const US_REGIONS = ["us", "enhanced_us"];

export function getReproducibilityCodeBlock(
  type,
  metadata,
  policy,
  region,
  year,
  householdInput = null,
  earningVariation = null,
) {
  // Return a series of lines, concatted into an array,
  // generated by sub-functions

  return [
    ...getHeaderCode(type, metadata, policy),
    ...getBaselineCode(type, policy, region),
    ...getReformCode(type, policy, region),
    ...getSituationCode(
      type,
      metadata,
      policy,
      year,
      householdInput,
      earningVariation,
    ),
    ...getImplementationCode(type, region, year),
  ];
}

function getHeaderCode(type, metadata, policy) {
  let lines = [];

  // Add lines depending upon type of block
  if (type === "household") {
    lines.push("from " + metadata.package + " import Simulation");
  } else {
    lines.push("from " + metadata.package + " import Microsimulation");
  }

  // If there is a reform, add the following Python imports
  if (Object.keys(policy.reform.data).length > 0) {
    lines.push(
      "from policyengine_core.reforms import Reform",
      "from policyengine_core.periods import instant",
    );
  }

  return lines;
}

export function getBaselineCode(type, policy, region) {
  // Disregard baseline code for household code
  // or non-US locales
  if (type === "household" || !US_REGIONS.includes(region)) {
    return [];
  }

  // Calculate the earliest start date and latest end date for
  // the policies included in the simulation
  const { earliestStart, latestEnd } = getStartEndDates(policy);

  return [
    "",
    "",
    `"""`,
    "In US nationwide simulations,",
    "use reported state income tax liabilities",
    `"""`,
    "def modify_baseline(parameters):",
    "    parameters.simulation.reported_state_income_tax.update(",
    `        start=instant("${earliestStart}"), stop=instant("${latestEnd}"),`,
    "        value=True)",
    "    return parameters",
    "",
    "",
    "class baseline_reform(Reform):",
    "    def apply(self):",
    "        self.modify_parameters(modify_baseline)",
  ];
}

export function getReformCode(type, policy, region) {
  // Return no reform code for households or for policies
  // without reform parameters
  if (Object.keys(policy.reform.data).length <= 0) {
    return [];
  }

  let lines = ["", "", "def modify_parameters(parameters):"];

  // For US reforms, when calculated society-wide, add reported state income tax
  if (type === "policy" && US_REGIONS.includes(region)) {
    // Calculate the earliest start date and latest end date for
    // the policies included in the simulation
    const { earliestStart, latestEnd } = getStartEndDates(policy);

    lines.push(
      "    parameters.simulation.reported_state_income_tax.update(",
      `        start=instant("${earliestStart}"), stop=instant("${latestEnd}"),`,
      "        value=True)",
    );
  }

  for (const [parameterName, parameter] of Object.entries(policy.reform.data)) {
    for (let [instant, value] of Object.entries(parameter)) {
      const [start, end] = instant.split(".");
      if (value === false) {
        value = "False";
      } else if (value === true) {
        value = "True";
      }
      lines.push(
        `    parameters.${parameterName}.update(`,
        `        start=instant("${start}"), stop=instant("${end}"),`,
        `        value=${value})`,
      );
    }
  }
  lines.push("    return parameters");

  lines = lines.concat([
    "",
    "",
    "class reform(Reform):",
    "    def apply(self):",
    "        self.modify_parameters(modify_parameters)",
  ]);
  return lines;
}

export function getSituationCode(
  type,
  metadata,
  policy,
  year,
  householdInput,
  earningVariation,
) {
  if (type !== "household") {
    return [];
  }

  let householdInputCopy = JSON.parse(
    JSON.stringify(optimiseHousehold(householdInput, metadata, true)),
  );

  for (const entityPlural of Object.keys(householdInputCopy)) {
    for (const entity of Object.keys(householdInputCopy[entityPlural])) {
      for (const variable of Object.keys(
        householdInputCopy[entityPlural][entity],
      )) {
        if (variable !== "members") {
          if (
            householdInputCopy[entityPlural][entity][variable][year] === null
          ) {
            delete householdInputCopy[entityPlural][entity][variable];
          }
        }
        if (earningVariation && variable === "employment_income") {
          delete householdInputCopy[entityPlural][entity][variable];
        }
      }
    }
  }

  if (earningVariation) {
    householdInputCopy["axes"] = [
      [{ name: "employment_income", count: 200, min: 0, max: 200_000 }],
    ];
  }

  let householdJson = JSON.stringify(householdInputCopy, null, 2);
  // It's Python-safe, so we need to make true -> True and false -> False and null -> None
  householdJson = householdJson
    .replace(/true/g, "True")
    .replace(/false/g, "False")
    .replace(/null/g, "None");

  let lines = [
    "",
    "",
    "situation = " + householdJson,
    "",
    "simulation = Simulation(",
  ];

  if (Object.keys(policy.reform.data).length) {
    lines.push("    reform=reform,");
  }

  lines = lines.concat([
    "    situation=situation,",
    ")",
    "",
    `output = simulation.calculate("household_net_income", ${year})`,
    "print(output)",
  ]);

  return lines;
}

export function getImplementationCode(type, region, timePeriod) {
  if (type !== "policy") {
    return [];
  }

  const isCountryUS = US_REGIONS.includes(region);

  return [
    `baseline = Microsimulation(${
      isCountryUS ? "reform=baseline_reform" : ""
    })`,
    "reformed = Microsimulation(reform=reform)",
    `baseline_person = baseline.calc("household_net_income",`,
    `    period=${timePeriod || defaultYear}, map_to="person")`,
    `reformed_person = reformed.calc("household_net_income",`,
    `    period=${timePeriod || defaultYear}, map_to="person")`,
    "difference_person = reformed_person - baseline_person",
  ];
}

export function getStartEndDates(policy) {
  let earliestStart = null;
  let latestEnd = null;

  for (const parameter of Object.keys(policy.reform.data)) {
    for (const instant of Object.keys(policy.reform.data[parameter])) {
      const [start, end] = instant.split(".");
      if (!earliestStart || Date.parse(start) < Date.parse(earliestStart)) {
        earliestStart = start;
      }
      if (!latestEnd || Date.parse(end) > Date.parse(latestEnd)) {
        latestEnd = end;
      }
    }
  }

  return {
    earliestStart: earliestStart,
    latestEnd: latestEnd,
  };
}
