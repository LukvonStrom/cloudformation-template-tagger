# cloudformation-template-tagger

## Known Gotchas:

The tool is only able to tag top-level Resources - nested ressources like `AWS::ApiGateway::Deployment StageDescription` are not tagged.