"use strict";
const FormData = require("form-data");
const fs = require("fs");
const axios = require("axios");

const { createCoreController } = require("@strapi/strapi").factories;

const handleMRImage = async (file, ctx, strapi) => {
  try {
    const [uploadedFile] = await strapi
      .plugin("upload")
      .service("upload")
      .upload({
        files: file,
        data: { refId: "", ref: "", field: "" },
      });

    const fileFormData = new FormData();
    const clFileFormData = new FormData();
    clFileFormData.append("upload", fs.createReadStream(file.path), file.name);

    const clFileResponse = await axios.post(
      process.env.AI_BACKEND,
      clFileFormData,
      {
        headers: {
          ...clFileFormData.getHeaders(),
        },
      }
    );

    const data = clFileResponse.data;

    const valueADD = data.prediction[0];
    const valueLDD = data.prediction[1];
    const valueMDD = data.prediction[2];
    const valueN = data.prediction[3];
    const max = Math.max(valueADD, valueLDD, valueMDD, valueN);
    const maxIndex = [valueADD, valueLDD, valueMDD, valueN].indexOf(max);
    const result = ["ADD", "LDD", "MDD", "N"][maxIndex];

    const image = await strapi.entityService.create(
      "api::mri-image.mri-image",
      {
        data: {
          image: uploadedFile.id,
          valueADD,
          valueLDD,
          valueMDD,
          valueN,
          result,
          publishedAt: new Date(),
        },
      }
    );

    return image;
  } catch (error) {
    console.log(error);
    ctx.throw(500, "Error creating TMJD test with MRI images", { error });
  }
};

module.exports = createCoreController(
  "api::tmjd-test.tmjd-test",
  ({ strapi }) => ({
    async create(ctx) {
      // Extract data from the request
      // const { data } = ctx.request.body;
      const dataJSON = ctx.request.body.data;
      const data = JSON.parse(dataJSON);

      const cl_file = ctx.request.files["cl_image"];
      const cr_file = ctx.request.files["cr_image"];
      const scl_file = ctx.request.files["scl_image"];
      const scr_file = ctx.request.files["scr_image"];
      const sol_file = ctx.request.files["sol_image"];
      const sor_file = ctx.request.files["sor_image"];

      console.log(data);
      console.log(cl_file);

      try {
        const cl_image = await handleMRImage(cl_file, ctx, strapi);
        const cr_image = await handleMRImage(cr_file, ctx, strapi);
        const scl_image = await handleMRImage(scl_file, ctx, strapi);
        const scr_image = await handleMRImage(scr_file, ctx, strapi);
        const sol_image = await handleMRImage(sol_file, ctx, strapi);
        const sor_image = await handleMRImage(sor_file, ctx, strapi);

        const tmjdTestData = {
          patient: data.patient,
          cl_image: cl_image.id,
          cr_image: cr_image.id,
          scl_image: scl_image.id,
          scr_image: scr_image.id,
          sol_image: sol_image.id,
          sor_image: sor_image.id,
          publishedAt: new Date(),
        };

        console.log(tmjdTestData);

        const tmjdTest = await strapi.entityService.create(
          "api::tmjd-test.tmjd-test",
          {
            data: tmjdTestData,
          }
        );

        return tmjdTest;
      } catch (error) {
        // Handle errors
        console.log(error);
        ctx.throw(500, "Error creating TMJD test with MRI images", { error });
      }
    },
  })
);
