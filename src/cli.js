const { Command, flags } = require('@oclif/command')

const inquirer = require("inquirer");
const fs = require('fs').promises;
const path = require("path")
const chalk = require("chalk")
const ora = require("ora");

const { loadTaggableResources, patchCloudformation, readJSONFile } = require('./api')



class CliCommand extends Command {

  tagStore = {};
  tags = {};
  targetTemplates = [];

  async run() {
    const { flags } = this.parse(CliCommand)
    this.log(chalk`{bold Starting Cloud Formation Tagger...}`);

    let currentFiles = await fs.readdir(process.cwd(), { withFileTypes: true })

    let { tagFile, cfFile } = flags;

    let cfPrompt = {
      type: 'checkbox',
      message: 'Select the cloudformation templates that shall be tagged',
      name: 'cftemplates',
      choices: currentFiles.filter(candidate => candidate.isFile() && candidate.name.includes(".json")/*candidate.isFile() && (candidate.name.includes(".json") || candidate.name.includes(".yml") || candidate.name.includes(".yaml"))*/).map(candidate => candidate.name),
      validate: async function (answer) {
        if (answer.length < 1) {
          return chalk`{red.bold You must choose at least one template.}`;
        }

        let invalidFiles = [];
        for (let template of answer) {
          try {
            let data = await readJSONFile(path.join(process.cwd(), template))
            return data.hasOwnProperty("Resources");
          } catch (e) {
            invalidFiles.push(template)
          }


        }

        if (invalidFiles.length === 0) {
          return true;
        } else {
          return chalk`{red.bold ${invalidFiles.join(', ')} ${invalidFiles.length > 1 ? "are" : "is"} not ${invalidFiles.length > 1 ? "" : "a "}valid Cloudformation ${invalidFiles.length > 1 ? "templates" : "template"}.}`
        }

      }
    };

    let tagPrompt = {
      type: 'checkbox',
      message: 'Select the json file containing the tags',
      name: 'tagFile',
      choices: currentFiles.filter(candidate => candidate.isFile() && candidate.name.includes(".json")).map(candidate => candidate.name),
      validate: async function (answer) {
        if (answer.length > 1) {
          return chalk`{red.bold You must choose exactly one tag file.}`
        } else if (answer.length == 0) {
          return chalk`{red.bold No tag file selected.}`
        }

        try {
          let data = await readJSONFile(path.join(process.cwd(), answer[0]))
          return data.hasOwnProperty("Tags");
        } catch (e) {
          return chalk`{red.bold ${answer} is not a valid tag file.}`
        }


      }
    }

    let documentation, blocklist;
    let cfSpinner = ora(chalk`{bold Loading taggable CloudFormation ressources}`);
    cfSpinner.start();


    try {
      blocklist = await readJSONFile(path.join(__dirname, "blocklist.json"));
      documentation = await loadTaggableResources(blocklist);
      cfSpinner.succeed(chalk`{bold.green Loaded taggable CloudFormation ressources}`);
    } catch (e) {
      cfSpinner.fail(chalk`{bold.red ${e.message}}`);
      this.error(e)
    }






    if (tagFile && !cfFile) {
      this.tags = tagFile;
      let { cftemplates } = await inquirer.prompt([cfPrompt])
      this.targetTemplates = cftemplates;
    } else if (!tagFile && cfFile) {
      this.targetTemplates = cfFile;
      let { tagFile } = await inquirer.prompt([tagPrompt])
      this.tags = tagFile
    } else {
      let { cftemplates, tagFile } = await inquirer.prompt([cfPrompt, tagPrompt])

      this.targetTemplates = cftemplates
      this.tags = tagFile
    }


    let tagSpinner = ora(chalk`{bold Adding Tags}`);
    tagSpinner.start();

    try {


      this.tags = await readJSONFile(path.join(process.cwd(), this.tags[0]), true)
      this.tags = this.tags.Tags;

      let template = this.targetTemplates[0]
      let { result, base } = await patchCloudformation(documentation, path.join(process.cwd(), template), this.tags)
      let file = template.split('.');
      let extensionLessFile = file.slice(0, -1).join('.')



      await fs.writeFile(path.join(process.cwd(), `${extensionLessFile}-improved.${file[file.length - 1]}`), JSON.stringify(result, null, 4))

      // await fs.writeFile('summary.json', JSON.stringify(documentation, null, 4))


      tagSpinner.succeed(chalk`{bold.green Wrote ${extensionLessFile}-improved.${file[file.length - 1]} with the tagged ressources}`);

    } catch (e) {

      tagSpinner.fail(chalk`{bold.red ${e.message}}`);
      this.error(e)
    }

    process.exit(0);

  }
}

CliCommand.description = `Tag a cloudformation template with a predefined tag set.`

CliCommand.flags = {
  version: flags.version({ char: 'v' }),
  help: flags.help({ char: 'h' }),
  tagFile: flags.string({ char: 't', description: "the path to the tag file" }),
  cfFile: flags.string({ char: "c", description: "the path to the cloudformation file" })
}

module.exports = CliCommand
