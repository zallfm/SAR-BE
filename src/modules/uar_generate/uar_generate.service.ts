import { uarGenerateRepository } from "./uar_generate.repository";

export type GenerateUARInput = {
  period: string;
  application_id: string;
//   uarId: number;
  createdBy: string;
};

export const uarGenerateService = {
  async generate(input: GenerateUARInput) {
    if (!input?.period || !input.application_id) throw new Error("period and application_id are require");
    const createdBy = input.createdBy || "system";

    const res = await uarGenerateRepository.generateAll({
      period: input.period,
      application_id: input.application_id,
    //   uarId: input.uarId,
      createdBy,
    });

    return {
      success: true,
      message: "Generate UAR selesai",
      data: {
        period: input.period,
        // uarId: input.uarId,
        divisionUser: res.divisionUser, // { inserted, updated }
        systemOwner:  res.systemOwner,  // { inserted, updated }
      },
    };
  },
};
