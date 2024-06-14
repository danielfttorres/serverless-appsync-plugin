"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Schema = void 0;
var globby_1 = __importDefault(require("globby"));
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var lodash_1 = require("lodash");
var graphql_1 = require("graphql");
//import ServerlessError from 'serverless/lib/serverless-error';
var validate_1 = require("graphql/validation/validate");
var merge_1 = require("@graphql-tools/merge");
var AWS_TYPES = "\ndirective @aws_iam on FIELD_DEFINITION | OBJECT\ndirective @aws_oidc on FIELD_DEFINITION | OBJECT\ndirective @aws_api_key on FIELD_DEFINITION | OBJECT\ndirective @aws_lambda on FIELD_DEFINITION | OBJECT\ndirective @aws_auth(cognito_groups: [String]) on FIELD_DEFINITION | OBJECT\ndirective @aws_cognito_user_pools(\n  cognito_groups: [String]\n) on FIELD_DEFINITION | OBJECT\ndirective @aws_subscribe(mutations: [String]) on FIELD_DEFINITION\ndirective @canonical on OBJECT\ndirective @hidden on OBJECT\ndirective @renamed on OBJECT\nscalar AWSDate\nscalar AWSTime\nscalar AWSDateTime\nscalar AWSTimestamp\nscalar AWSEmail\nscalar AWSJSON\nscalar AWSURL\nscalar AWSPhone\nscalar AWSIPAddress\n";
var Schema = /** @class */ (function () {
    function Schema(api, schemas) {
        this.api = api;
        this.schemas = schemas;
    }
    Schema.prototype.compile = function () {
        var _a;
        var logicalId = this.api.naming.getSchemaLogicalId();
        return _a = {},
            _a[logicalId] = {
                Type: 'AWS::AppSync::GraphQLSchema',
                Properties: {
                    Definition: this.generateSchema(),
                    ApiId: this.api.getApiId(),
                },
            },
            _a;
    };
    Schema.prototype.valdiateSchema = function (schema) {
        var errors = (0, validate_1.validateSDL)((0, graphql_1.parse)(schema));
        if (errors.length > 0) {
            throw new Error('Invalid GraphQL schema:\n' +
                errors.map(function (error) { return "     ".concat(error.message); }).join('\n'));
        }
    };
    Schema.prototype.generateSchema = function () {
        var _this = this;
        var schemaFiles = (0, lodash_1.flatten)(globby_1.default.sync(this.schemas));
        var schemas = schemaFiles.map(function (file) {
            return fs_1.default.readFileSync(path_1.default.join(_this.api.plugin.serverless.config.servicePath, file), 'utf8');
        });
        this.valdiateSchema(AWS_TYPES + '\n' + schemas.join('\n'));
        // Return single files as-is.
        if (schemas.length === 1) {
            return schemas[0];
        }
        // AppSync does not support Object extensions
        // https://spec.graphql.org/October2021/#sec-Object-Extensions
        // Merge the schemas
        return (0, graphql_1.print)((0, merge_1.mergeTypeDefs)(schemas, {
            forceSchemaDefinition: false,
            useSchemaDefinition: false,
            sort: true,
            throwOnConflict: true,
        }));
    };
    return Schema;
}());
exports.Schema = Schema;
//# sourceMappingURL=Schema.js.map