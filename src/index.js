const fs = require('fs').promises;
const marked = require('marked');
const path = require('path')

async function main(){
    let documentation = [];
    let foundDocumentations = await fs.readdir('../aws-cloudformation-user-guide/doc_source');
    for(let documentationFile of foundDocumentations.filter(item => item.includes('aws-resource-'))){
        let rawFileContent = await fs.readFile(path.join('../aws-cloudformation-user-guide/doc_source', documentationFile));
        let fileContent = marked.lexer(rawFileContent.toString())      

        let propertiesIdx = fileContent.findIndex(element=> {
            return element.type === "heading" &&
            element.depth === 2 && 
            element.text.includes("Properties")
        })

        let endIdx = (fileContent.slice(propertiesIdx+1, fileContent.length -1)).findIndex(element => element.type === "heading" && element.depth == 2);


        let matchingRange = fileContent.slice(propertiesIdx, propertiesIdx + 1 + endIdx);

        let isTaggable = matchingRange.filter(element => {
            return element.text && element.text.includes("`Tags`")
        }).length > 0

        let resourceName = fileContent[0].tokens[0].text;


        documentation.push({resourceName, isTaggable})
    }
    await fs.writeFile('summary.json', JSON.stringify(documentation, null, 4))
    
}

main();