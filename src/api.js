const fs = require('fs').promises;
const fsl = require('fs')
const marked = require('marked');
const path = require('path');

function readJSONFile(filename){    
    return new Promise((resolve, reject) => {
        let data = fsl.readFileSync(filename);
        resolve(JSON.parse(data.toString()))
    });
}

function readMarkDown(filename){
    return new Promise((resolve, reject) => {
        let data = fsl.readFileSync(filename);
        resolve(marked.lexer(data.toString()))
    });
}


async function loadTaggableResources(blocklist) {
    let documentation = {};
    let foundDocumentations = await fs.readdir('../aws-cloudformation-user-guide/doc_source');
    for (let documentationFile of foundDocumentations.filter(item => item.includes('aws-resource-') || item.includes('aws-properties-'))) {
        let fileContent = await readMarkDown(path.join(__dirname, '../aws-cloudformation-user-guide/doc_source', documentationFile))
        let resourceName = fileContent[0].tokens[0].text;

        let propertiesIdx = fileContent.findIndex(element => element.type === "heading" && element.depth === 2 && element.text.includes("Properties"))
        let endIdx = (fileContent.slice(propertiesIdx + 1, fileContent.length - 1)).findIndex(element => element.type === "heading" && element.depth == 2);
        let matchingRange = fileContent.slice(propertiesIdx, propertiesIdx + 1 + endIdx);


        matchingRange.map(element => {
            if (element.tokens && element.tokens[0].type === 'codespan' && element.text.includes("Tag")) {
                let typeOfIndex = element.tokens.findIndex(element => element.type === "em" && element.text === "Type")

                let type = element.tokens[typeOfIndex + 1].text;
                if (element.tokens[typeOfIndex + 2] && element.tokens[typeOfIndex + 2].hasOwnProperty("text")) {
                    type += element.tokens[typeOfIndex + 2].text
                }
                type = type.replace(": ", "").trim();

                if (blocklist.filter(el => element.tokens[0].text.includes(el)).length > 0 || type === "String" || type === "Boolean" || resourceName.includes(" ")) {
                    return null;
                }
                return { resourceName, tagAttribute: element.tokens[0].text, type }
            }
        }).filter(el => !!el).forEach((element) => {
            documentation[`${element.resourceName}-${element.tagAttribute}`] = element;
        })
    }
    return documentation;
}

async function patchCloudformation(documentation, filePath, tags) {
    let template = await readJSONFile(filePath)
    let base = template;

    for (let [resourceName, resource] of Object.entries(template.Resources)) {
        let foundResource = (Object.entries(documentation)).find(([key, entry]) => resource.Type === entry.resourceName)
        if (foundResource && foundResource.length > 1 && foundResource[1]) {
            if (resource.Properties.hasOwnProperty(foundResource[1].tagAttribute)) {
                resource.Properties[foundResource[1].tagAttribute] = {...resource.Properties[foundResource[1].tagAttribute], ...tags}
            } else {
                resource.Properties[foundResource[1].tagAttribute] = tags;
            }
        } else {
            // console.log(resource.Type, foundResource)
            // not found
        }
        template[resourceName] = resource;
    }

    return { result: template, base };
}

module.exports = { loadTaggableResources, patchCloudformation, readJSONFile }