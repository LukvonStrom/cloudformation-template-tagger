const fs = require('fs').promises;
const marked = require('marked');
const path = require('path');

async function main(){
    let documentation = {};
    let foundDocumentations = await fs.readdir('../aws-cloudformation-user-guide/doc_source');
    for(let documentationFile of foundDocumentations.filter(item => item.includes('aws-resource-') || item.includes('aws-properties-'))){
        let rawFileContent = await fs.readFile(path.join(__dirname, '../aws-cloudformation-user-guide/doc_source', documentationFile));
        let fileContent = marked.lexer(rawFileContent.toString()) 

        let resourceName = fileContent[0].tokens[0].text;     

        let propertiesIdx = fileContent.findIndex(element=> {
            return element.type === "heading" &&
            element.depth === 2 && 
            element.text.includes("Properties")
        })

        let endIdx = (fileContent.slice(propertiesIdx+1, fileContent.length -1)).findIndex(element => element.type === "heading" && element.depth == 2);


        let matchingRange = fileContent.slice(propertiesIdx, propertiesIdx + 1 + endIdx);


        let blocklist = JSON.parse(await fs.readFile(path.join(__dirname, "blocklist.json")));

        matchingRange.map(element => {
            if(element.tokens && element.tokens[0].type === 'codespan' && element.text.includes("Tag")){

                let typeOfIndex = element.tokens.findIndex(element => {
                    return element.type === "em" && element.text === "Type"
                })

                

                let type = element.tokens[typeOfIndex+1].text;

                if(element.tokens[typeOfIndex+2] && element.tokens[typeOfIndex+2].hasOwnProperty("text")){
                    type += element.tokens[typeOfIndex+2].text
                }

                type = type.replace(": ", "").trim();

                if( blocklist.filter(el => element.tokens[0].text.includes(el)).length > 0 || type === "String" || type === "Boolean" || resourceName.includes(" ")){

                    return null;
                }

                return {resourceName, tagAttribute: element.tokens[0].text, type}
                
            }
        }).filter(el => !!el).forEach((element) => {
            documentation[`${element.resourceName}-${element.tagAttribute}`] = element;
        })

    }

    // load embedded ressources, match to List of XXX
    /*
    let properties = [];
    
    for(let documentationFile of foundDocumentations.filter(item => item.includes('aws-properties-'))){
        let cleanedFileName = (documentationFile.replace("aws-resource-", '')).replace('.md', '');
        let rawFileContent = await fs.readFile(path.join(__dirname, '../aws-cloudformation-user-guide/doc_source', documentationFile));
        let fileContent = marked.lexer(rawFileContent.toString()) 

        let propertyName, parsedSyntax;
        if(fileContent[0].type === "heading" && fileContent[0].depth === 1){
            propertyName = fileContent[0].tokens[0].text;
        }
        let jsonSyntaxEl = fileContent.findIndex(element => element.type === "heading" && element.depth === 3 && element.text.includes("syntax.json") && element.tokens[0].type === "text")
        if(fileContent[jsonSyntaxEl+1].type === "code"){

        }
        properties.push({propertyName})
        await fs.writeFile(path.join(__dirname, 'props/'+ documentationFile + '.json'), JSON.stringify(fileContent, null, 4))

    }*/

    let tags = {
        Costunit: "ABCDE",
    }

    let data = JSON.parse(await (await fs.readFile(path.join(__dirname, "../test-cf.json"))).toString())

    for(let [key, resource] of Object.entries(data.Resources)){
        let foundResource = (Object.entries(documentation)).find(([key, value]) => resource.Type === value.resourceName)

        if(foundResource && foundResource.length > 1 && foundResource[1]){
            
            if(resource.Properties.hasOwnProperty(foundResource[1].tagAttribute)){
                console.log(foundResource[1].tagAttribute)
                resource.Properties[foundResource[1].tagAttribute] = {...resource.Properties[foundResource[1].tagAttribute], ...tags}
            }else{
                resource.Properties[foundResource[1].tagAttribute] = tags;
            }
        }else{
            console.log(resource.Type, foundResource)
        }

        data[key] = resource;
        
    }

    await fs.writeFile(path.join(__dirname, "../test-cf-pre.json"), JSON.stringify(JSON.parse(await (await fs.readFile(path.join(__dirname, "../test-cf.json"))).toString()), null, 4))
    await fs.writeFile(path.join(__dirname, "../test-cf-post.json"), JSON.stringify(data, null, 4))


    await fs.writeFile('summary.json', JSON.stringify(documentation, null, 4))
    
}

function isJsonString(string) {
    try {
        JSON.parse(string);
    } catch (e) {
        return false;
    }
    return true;
}

main();