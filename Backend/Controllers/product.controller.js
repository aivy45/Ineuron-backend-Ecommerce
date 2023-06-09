import Product from "../Models/product.schema.js"
import formidable from "formidable"
import fs from "fs"
import {deleteFile, s3FileUpload} from "../services/imageUpload.js"
import Mongoose from "mongoose"
import asyncHandler from "../services/asyncHandler.js"
import CustomError from "../utilis/custormError.js"
import config from "../config/index.js"


/**
 * @ADD_PRODUCT                 
 * @route https://localhost:5000/api/product
 * @description uses aws s3 bucket for image upload
 * @returns Product Object
 */

export const addProduct = asyncHandler(async(req,res)=>{
    const form = formidable({
        multiples: true, 
        keepExtensions: true, 
    }); 

    form.parse(req, async function(err,fields,files){
         try{
            if(err)
            {
      throw new CustomError(err.message || "Something went wrong", 500)
            }

          let productId = new Mongoose.Types.ObjectId().toHexString(); 
          // generating id for mongodb manually its like bson  
        //    console.log(fields, files); 
    
        // check for fileds
        if(!fields.name ||
           !fields.price ||
           !fields.description ||
           !fields.collectionId 
            ){
      throw new CustomError("Please fill all details", 500)
         }


         //handling images upload image
         let imgArrayResp = Promise.all(
              // It returns array
              Object.keys(files).map(async (filekey, index)=>{
                const element = files[filekey]
              const data = fs.readFileSync(element.filepath)

              const upload = await s3FileUpload({
                bucketName: config.S3_BUCKET_NAME,
                key: `products/ ${productId}/photo_${index+1}.png`,
                body: data, 
                contentType: element.mimetype
              })

              return {
                secure_url: upload.Location  // get location of bucket
              }
              })
         )

         let imgArray = await imgArrayResp;

         const product = await Product.create({
          _id: productId, 
          photos: imgArray, 
          ...fields, 
         })

         if(!product)
         {
          throw new CustomError("Product was not created", 400)
         }

         res.status(200).json({
          success: true, 
          product
         })



         }
         catch(error){
           return res.status(500).json({
            success: false, 
            message: error.message || "Something went wrong"
           })
        }
    })
})




