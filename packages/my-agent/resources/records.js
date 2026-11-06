import { Service } from "@deepseek-ai/cordis";

const records = {
  alpha: {
    id: "alpha",
    quantity: 4,
    unit_price: 12,
    currency: "CNY",
    source: "fixture://catalog/alpha",
    synthetic: true,
  },
  beta: {
    id: "beta",
    quantity: 3,
    unit_price: 7,
    currency: "CNY",
    source: "fixture://catalog/beta",
    synthetic: true,
  },
};

export class ExampleRecords extends Service {
  constructor(ctx) {
    super(ctx, "myAgentRecords");
  }

  lookup(id) {
    if (!Object.hasOwn(records, id)) {
      throw new Error(`Unknown synthetic record: ${id}`);
    }
    return structuredClone(records[id]);
  }
}

export default ExampleRecords;
