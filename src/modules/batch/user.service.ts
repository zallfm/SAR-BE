import { FastifyInstance } from "fastify";

export const userService = {

  async getRecipientEmail(
    app: FastifyInstance,
    itemCode: string,
    uarId: string,
    subjectNoreg: string 
  ): Promise<string | null> {

    if (itemCode.startsWith("PIC_")) {
      try {
        const uarTask = await app.prisma.tB_R_UAR_DIVISION_USER.findFirst({
          where: { UAR_ID: uarId, NOREG: subjectNoreg },
        });

        if (!uarTask || !uarTask.DIVISION_ID) {
          app.log.warn(
            `Could not find UAR task or DIVISION_ID for UAR_ID: ${uarId}, NOREG: ${subjectNoreg}`
          );
          return null;
        }

        const divisionId = uarTask.DIVISION_ID;
        const pic = await app.prisma.tB_M_UAR_PIC.findFirst({
          where: { DIVISION_ID: divisionId },
        });

        if (!pic) {
          app.log.warn(`No PIC found for DIVISION_ID: ${divisionId}`);
          return null;
        }
        return pic.MAIL; 
      } catch (error) {
        app.log.error(
          error,
          `Failed to get PIC UAR email for UAR_ID: ${uarId}`
        );
        return null;
      }
    }

  
    if (itemCode.startsWith("UAR_") || itemCode.startsWith("DIV_")) {
      try {
        let recipientNoreg: string | null | undefined = null;

        if (itemCode.startsWith("UAR_")) {
          // ---
          // Instruction: "System Owner... get mail..."
          // We find the System Owner from the UAR task's Application.
          // ---
          const uarTask = await app.prisma.tB_R_UAR_SYSTEM_OWNER.findFirst({
            where: { UAR_ID: uarId, NOREG: subjectNoreg },
            include: { TB_M_APPLICATION: true },
          });

          if (!uarTask || !uarTask.TB_M_APPLICATION) {
            app.log.warn(
              `Could not find UAR task or Application for UAR_ID: ${uarId}`
            );
            return null;
          }
          recipientNoreg = uarTask.TB_M_APPLICATION.NOREG_SYSTEM_OWNER;
        } else if (itemCode.startsWith("DIV_")) {

          const uarTask = await app.prisma.tB_R_UAR_DIVISION_USER.findFirst({
            where: { UAR_ID: uarId, NOREG: subjectNoreg },
          });

          if (!uarTask) {
            app.log.warn(`Could not find UAR task for UAR_ID: ${uarId}`);
            return null;
          }
          recipientNoreg = uarTask.REVIEWER_NOREG;
        }

        if (!recipientNoreg) {
          app.log.warn(
            `Could not determine a recipient NOREG for ITEM_CODE: ${itemCode}`
          );
          return null;
        }

        return this.getEmailFromNoreg(app, recipientNoreg);
      } catch (error) {
        app.log.error(error, `Failed to get recipient for UAR_ID: ${uarId}`);
        return null;
      }
    }


    if (itemCode.endsWith("_COMPLETED")) {
      return this.getEmailFromNoreg(app, subjectNoreg);
    }

    app.log.warn(`Unknown ITEM_CODE logic: ${itemCode}`);
    return null;
  },

  async getEmailFromNoreg(
    app: FastifyInstance,
    noreg: string
  ): Promise<string | null> {
    if (!app.prismaSC) {
      app.log.error("Prisma client 'prismaSC' is not initialized.");
      return null;
    }

    try {
      const user = await app.prisma.tB_M_EMPLOYEE.findFirst({
        where: {
          NOREG: noreg,
          VALID_TO: { gte: new Date() },
        },
        orderBy: {
          VALID_TO: "desc",
        },
      });

      if (!user) {
        app.log.warn(
          `No valid user found in TB_M_EMPLOYEE for NOREG: ${noreg}`
        );
        return null;
      }
      return user.MAIL;
    } catch (error) {
      app.log.error(
        error,
        `Failed to get user email from TB_H_EMPLOYEE for NOREG: ${noreg}`
      );
      return null;
    }
  },
};
