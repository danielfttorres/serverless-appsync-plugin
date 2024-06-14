"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var log_1 = require("@serverless/utils/log");
var lodash_1 = require("lodash");
var getAppSyncConfig_1 = require("./getAppSyncConfig");
var graphql_1 = require("graphql");
var luxon_1 = require("luxon");
var chalk_1 = __importDefault(require("chalk"));
var path_1 = __importDefault(require("path"));
var open_1 = __importDefault(require("open"));
var fs_1 = __importDefault(require("fs"));
var validation_1 = require("./validation");
var utils_1 = require("./utils");
var Api_1 = require("./resources/Api");
var Naming_1 = require("./resources/Naming");
var terminal_link_1 = __importDefault(require("terminal-link"));
var CONSOLE_BASE_URL = 'https://console.aws.amazon.com';
var ServerlessAppsyncPlugin = /** @class */ (function () {
    function ServerlessAppsyncPlugin(serverless, options) {
        var _this = this;
        this.serverless = serverless;
        this.options = options;
        this.resolveVariable = function (_a) {
            var address = _a.address;
            _this.loadConfig();
            if (!_this.naming) {
                throw new _this.serverless.classes.Error('Could not find the naming service. This should not happen.');
            }
            if (address === 'id') {
                return {
                    value: {
                        'Fn::GetAtt': [_this.naming.getApiLogicalId(), 'ApiId'],
                    },
                };
            }
            else if (address === 'arn') {
                return {
                    value: {
                        'Fn::GetAtt': [_this.naming.getApiLogicalId(), 'Arn'],
                    },
                };
            }
            else if (address === 'url') {
                return {
                    value: {
                        'Fn::GetAtt': [_this.naming.getApiLogicalId(), 'GraphQLUrl'],
                    },
                };
            }
            else if (address.startsWith('apiKey.')) {
                var _b = address.split('.'), name_1 = _b[1];
                return {
                    value: {
                        'Fn::GetAtt': [_this.naming.getApiKeyLogicalId(name_1), 'ApiKey'],
                    },
                };
            }
            else {
                throw new _this.serverless.classes.Error("Unknown address '".concat(address, "'"));
            }
        };
        this.gatheredData = {
            apis: [],
            apiKeys: [],
        };
        this.serverless = serverless;
        this.options = options;
        this.provider = this.serverless.getProvider('aws');
        // We are using a newer version of AJV than Serverless Framework
        // and some customizations (eg: custom errors, $merge, filter irrelevant errors)
        // For SF, just validate the type of input to allow us to use a custom
        // field (ie: `appSync`). Actual validation will be handled by this plugin
        // later in `validateConfig()`
        this.serverless.configSchemaHandler.defineTopLevelProperty('appSync', {
            type: 'object',
        });
        this.configurationVariablesSources = {
            appsync: {
                resolve: this.resolveVariable,
            },
        };
        this.commands = {
            appsync: {
                usage: 'Manage the AppSync API',
                commands: {
                    'validate-schema': {
                        usage: 'Validate the graphql schema',
                        lifecycleEvents: ['run'],
                    },
                    'get-introspection': {
                        usage: "Get the API's introspection schema",
                        lifecycleEvents: ['run'],
                        options: {
                            format: {
                                usage: 'Specify the output format (JSON or SDL). Default: `JSON`',
                                shortcut: 'f',
                                required: false,
                                type: 'string',
                            },
                            output: {
                                usage: 'Output to a file. If not specified, writes to stdout',
                                shortcut: 'o',
                                required: false,
                                type: 'string',
                            },
                        },
                    },
                    'flush-cache': {
                        usage: 'Flushes the cache of the API.',
                        lifecycleEvents: ['run'],
                    },
                    console: {
                        usage: 'Open the AppSync AWS console',
                        lifecycleEvents: ['run'],
                    },
                    cloudwatch: {
                        usage: 'Open the CloudWatch AWS console',
                        lifecycleEvents: ['run'],
                    },
                    logs: {
                        usage: 'Output the logs of the AppSync API to stdout',
                        lifecycleEvents: ['run'],
                        options: {
                            startTime: {
                                usage: 'Starting time. Default: 10m (10 minutes ago)',
                                required: false,
                                type: 'string',
                            },
                            tail: {
                                usage: 'Tail the log output',
                                shortcut: 't',
                                required: false,
                                type: 'boolean',
                            },
                            interval: {
                                usage: 'Tail polling interval in milliseconds. Default: `1000`',
                                shortcut: 'i',
                                required: false,
                                type: 'string',
                            },
                            filter: {
                                usage: 'A filter pattern to apply to the logs',
                                shortcut: 'f',
                                required: false,
                                type: 'string',
                            },
                        },
                    },
                    domain: {
                        usage: 'Manage the domain for this AppSync API',
                        commands: {
                            create: {
                                usage: 'Create the domain in AppSync',
                                lifecycleEvents: ['run'],
                                options: {
                                    quiet: {
                                        usage: "Don't return an error if the domain already exists",
                                        shortcut: 'q',
                                        required: false,
                                        type: 'boolean',
                                    },
                                    yes: {
                                        usage: 'Automatic yes to prompts',
                                        shortcut: 'y',
                                        required: false,
                                        type: 'boolean',
                                    },
                                },
                            },
                            delete: {
                                usage: 'Delete the domain from AppSync',
                                lifecycleEvents: ['run'],
                                options: {
                                    quiet: {
                                        usage: "Don't return an error if the domain does not exist",
                                        shortcut: 'q',
                                        required: false,
                                        type: 'boolean',
                                    },
                                    yes: {
                                        usage: 'Automatic yes to prompts',
                                        shortcut: 'y',
                                        required: false,
                                        type: 'boolean',
                                    },
                                },
                            },
                            'create-record': {
                                usage: 'Create the Alias record for this domain in Route53',
                                lifecycleEvents: ['run'],
                                options: {
                                    quiet: {
                                        usage: "Don't return an error if the record already exists",
                                        shortcut: 'q',
                                        required: false,
                                        type: 'boolean',
                                    },
                                    yes: {
                                        usage: 'Automatic yes to prompts',
                                        shortcut: 'y',
                                        required: false,
                                        type: 'boolean',
                                    },
                                },
                            },
                            'delete-record': {
                                usage: 'Deletes the Alias record for this domain from Route53',
                                lifecycleEvents: ['run'],
                                options: {
                                    quiet: {
                                        usage: "Don't return an error if the record does not exist",
                                        shortcut: 'q',
                                        required: false,
                                        type: 'boolean',
                                    },
                                    yes: {
                                        usage: 'Automatic yes to prompts',
                                        shortcut: 'y',
                                        required: false,
                                        type: 'boolean',
                                    },
                                },
                            },
                            assoc: {
                                usage: 'Associate this AppSync API with the domain',
                                lifecycleEvents: ['run'],
                                options: {
                                    yes: {
                                        usage: 'Automatic yes to prompts',
                                        shortcut: 'y',
                                        required: false,
                                        type: 'boolean',
                                    },
                                },
                            },
                            disassoc: {
                                usage: 'Disassociate the AppSync API associated to the domain',
                                lifecycleEvents: ['run'],
                                options: {
                                    yes: {
                                        usage: 'Automatic yes to prompts',
                                        shortcut: 'y',
                                        required: false,
                                        type: 'boolean',
                                    },
                                    force: {
                                        usage: 'Force the disassociation of *any* API from this domain',
                                        shortcut: 'f',
                                        required: false,
                                        type: 'boolean',
                                    },
                                },
                            },
                        },
                    },
                },
            },
        };
        this.hooks = {
            'after:aws:info:gatherData': function () { return _this.gatherData(); },
            'after:aws:info:displayServiceInfo': function () {
                _this.displayEndpoints();
                _this.displayApiKeys();
            },
            // Commands
            'appsync:validate-schema:run': function () {
                _this.loadConfig();
                _this.validateSchemas();
                log_1.log.success('AppSync schema valid');
            },
            'appsync:get-introspection:run': function () { return _this.getIntrospection(); },
            'appsync:flush-cache:run': function () { return _this.flushCache(); },
            'appsync:console:run': function () { return _this.openConsole(); },
            'appsync:cloudwatch:run': function () { return _this.openCloudWatch(); },
            'appsync:logs:run': function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, this.initShowLogs()];
            }); }); },
            'before:appsync:domain:create:run': function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, this.initDomainCommand()];
            }); }); },
            'appsync:domain:create:run': function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, this.createDomain()];
            }); }); },
            'before:appsync:domain:delete:run': function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, this.initDomainCommand()];
            }); }); },
            'appsync:domain:delete:run': function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, this.deleteDomain()];
            }); }); },
            'before:appsync:domain:assoc:run': function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, this.initDomainCommand()];
            }); }); },
            'appsync:domain:assoc:run': function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, this.assocDomain()];
            }); }); },
            'before:appsync:domain:disassoc:run': function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, this.initDomainCommand()];
            }); }); },
            'appsync:domain:disassoc:run': function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, this.disassocDomain()];
            }); }); },
            'before:appsync:domain:create-record:run': function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, this.initDomainCommand()];
            }); }); },
            'appsync:domain:create-record:run': function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, this.createRecord()];
            }); }); },
            'before:appsync:domain:delete-record:run': function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, this.initDomainCommand()];
            }); }); },
            'appsync:domain:delete-record:run': function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, this.deleteRecord()];
            }); }); },
            finalize: function () {
                (0, log_1.writeText)('\nLooking for a better AppSync development experience? Have you tried GraphBolt? https://graphbolt.dev');
            },
        };
        // These hooks need the config to be loaded and
        // processed in order to add embedded functions
        // to the service. (eg: function defined in resolvers)
        [
            'before:logs:logs',
            'before:deploy:function:initialize',
            'before:package:initialize',
            'before:aws:info:gatherData',
        ].forEach(function (hook) {
            _this.hooks[hook] = function () {
                _this.loadConfig();
                _this.buildAndAppendResources();
            };
        });
    }
    ServerlessAppsyncPlugin.prototype.getApiId = function () {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var logicalIdGraphQLApi, StackResources, apiId;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        this.loadConfig();
                        if (!this.naming) {
                            throw new this.serverless.classes.Error('Could not find the naming service. This should not happen.');
                        }
                        logicalIdGraphQLApi = this.naming.getApiLogicalId();
                        return [4 /*yield*/, this.provider.request('CloudFormation', 'describeStackResources', {
                                StackName: this.provider.naming.getStackName(),
                                LogicalResourceId: logicalIdGraphQLApi,
                            })];
                    case 1:
                        StackResources = (_c.sent()).StackResources;
                        apiId = (0, lodash_1.last)((_b = (_a = StackResources === null || StackResources === void 0 ? void 0 : StackResources[0]) === null || _a === void 0 ? void 0 : _a.PhysicalResourceId) === null || _b === void 0 ? void 0 : _b.split('/'));
                        if (!apiId) {
                            throw new this.serverless.classes.Error('AppSync Api not found in stack. Did you forget to deploy?');
                        }
                        return [2 /*return*/, apiId];
                }
            });
        });
    };
    ServerlessAppsyncPlugin.prototype.gatherData = function () {
        return __awaiter(this, void 0, void 0, function () {
            var apiId, graphqlApi, apiKeys;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getApiId()];
                    case 1:
                        apiId = _a.sent();
                        return [4 /*yield*/, this.provider.request('AppSync', 'getGraphqlApi', {
                                apiId: apiId,
                            })];
                    case 2:
                        graphqlApi = (_a.sent()).graphqlApi;
                        (0, lodash_1.forEach)(graphqlApi === null || graphqlApi === void 0 ? void 0 : graphqlApi.uris, function (value, type) {
                            _this.gatheredData.apis.push({
                                id: apiId,
                                type: type.toLowerCase(),
                                uri: value,
                            });
                        });
                        return [4 /*yield*/, this.provider.request('AppSync', 'listApiKeys', {
                                apiId: apiId,
                            })];
                    case 3:
                        apiKeys = (_a.sent()).apiKeys;
                        apiKeys === null || apiKeys === void 0 ? void 0 : apiKeys.forEach(function (apiKey) {
                            _this.gatheredData.apiKeys.push({
                                value: apiKey.id || 'unknown key',
                                description: apiKey.description,
                            });
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    ServerlessAppsyncPlugin.prototype.getIntrospection = function () {
        return __awaiter(this, void 0, void 0, function () {
            var apiId, schema, filePath;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getApiId()];
                    case 1:
                        apiId = _a.sent();
                        return [4 /*yield*/, this.provider.request('AppSync', 'getIntrospectionSchema', {
                                apiId: apiId,
                                format: (this.options.format || 'JSON').toUpperCase(),
                            })];
                    case 2:
                        schema = (_a.sent()).schema;
                        if (!schema) {
                            throw new this.serverless.classes.Error('Schema not found');
                        }
                        if (this.options.output) {
                            try {
                                filePath = path_1.default.resolve(this.options.output);
                                fs_1.default.writeFileSync(filePath, schema.toString());
                                log_1.log.success("Introspection schema exported to ".concat(filePath));
                            }
                            catch (error) {
                                log_1.log.error("Could not save to file: ".concat(error.message));
                            }
                            return [2 /*return*/];
                        }
                        (0, log_1.writeText)(schema.toString());
                        return [2 /*return*/];
                }
            });
        });
    };
    ServerlessAppsyncPlugin.prototype.flushCache = function () {
        return __awaiter(this, void 0, void 0, function () {
            var apiId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getApiId()];
                    case 1:
                        apiId = _a.sent();
                        return [4 /*yield*/, this.provider.request('AppSync', 'flushApiCache', { apiId: apiId })];
                    case 2:
                        _a.sent();
                        log_1.log.success('Cache flushed successfully');
                        return [2 /*return*/];
                }
            });
        });
    };
    ServerlessAppsyncPlugin.prototype.openConsole = function () {
        return __awaiter(this, void 0, void 0, function () {
            var apiId, region, url;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getApiId()];
                    case 1:
                        apiId = _a.sent();
                        region = this.serverless.service.provider.region;
                        url = "".concat(CONSOLE_BASE_URL, "/appsync/home?region=").concat(region, "#/").concat(apiId, "/v1/home");
                        (0, open_1.default)(url);
                        return [2 /*return*/];
                }
            });
        });
    };
    ServerlessAppsyncPlugin.prototype.openCloudWatch = function () {
        return __awaiter(this, void 0, void 0, function () {
            var apiId, region, url;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getApiId()];
                    case 1:
                        apiId = _a.sent();
                        region = this.serverless.service.provider.region;
                        url = "".concat(CONSOLE_BASE_URL, "/cloudwatch/home?region=").concat(region, "#logsV2:log-groups/log-group/$252Faws$252Fappsync$252Fapis$252F").concat(apiId);
                        (0, open_1.default)(url);
                        return [2 /*return*/];
                }
            });
        });
    };
    ServerlessAppsyncPlugin.prototype.initShowLogs = function () {
        return __awaiter(this, void 0, void 0, function () {
            var apiId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getApiId()];
                    case 1:
                        apiId = _a.sent();
                        return [4 /*yield*/, this.showLogs("/aws/appsync/apis/".concat(apiId))];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ServerlessAppsyncPlugin.prototype.showLogs = function (logGroupName, nextToken) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var startTime, _b, events, newNextToken, lastTs, interval;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (this.options.startTime) {
                            startTime = (0, utils_1.parseDateTimeOrDuration)(this.options.startTime);
                        }
                        else {
                            startTime = luxon_1.DateTime.now().minus({ minutes: 10 });
                        }
                        return [4 /*yield*/, this.provider.request('CloudWatchLogs', 'filterLogEvents', {
                                logGroupName: logGroupName,
                                startTime: startTime.toMillis(),
                                nextToken: nextToken,
                                filterPattern: this.options.filter,
                            })];
                    case 1:
                        _b = _c.sent(), events = _b.events, newNextToken = _b.nextToken;
                        events === null || events === void 0 ? void 0 : events.forEach(function (event) {
                            var timestamp = event.timestamp, message = event.message;
                            (0, log_1.writeText)("".concat(chalk_1.default.gray(luxon_1.DateTime.fromMillis(timestamp || 0).toISO()), "\t").concat(message));
                        });
                        lastTs = (_a = (0, lodash_1.last)(events)) === null || _a === void 0 ? void 0 : _a.timestamp;
                        this.options.startTime = lastTs
                            ? luxon_1.DateTime.fromMillis(lastTs + 1).toISO()
                            : this.options.startTime;
                        if (!this.options.tail) return [3 /*break*/, 4];
                        interval = this.options.interval
                            ? parseInt(this.options.interval, 10)
                            : 1000;
                        return [4 /*yield*/, (0, utils_1.wait)(interval)];
                    case 2:
                        _c.sent();
                        return [4 /*yield*/, this.showLogs(logGroupName, newNextToken)];
                    case 3:
                        _c.sent();
                        _c.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ServerlessAppsyncPlugin.prototype.initDomainCommand = function () {
        return __awaiter(this, void 0, void 0, function () {
            var domain, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.loadConfig();
                        domain = this.getDomain();
                        if (!(domain.useCloudFormation !== false)) return [3 /*break*/, 3];
                        log_1.log.warning('You are using the CloudFormation integration for domain configuration.\n' +
                            'To avoid CloudFormation drifts, you should not use it in combination with this command.\n' +
                            'Set the `domain.useCloudFormation` attribute to false to use the CLI integration.\n' +
                            'If you have already deployed using CloudFormation and would like to switch to using the CLI, you can ' +
                            (0, terminal_link_1.default)('eject from CloudFormation', 'https://github.com/sid88in/serverless-appsync-plugin/blob/master/doc/custom-domain.md#ejecting-from-cloudformation') +
                            ' first.');
                        _a = !this.options.yes;
                        if (!_a) return [3 /*break*/, 2];
                        return [4 /*yield*/, (0, utils_1.confirmAction)()];
                    case 1:
                        _a = !(_b.sent());
                        _b.label = 2;
                    case 2:
                        if (_a) {
                            process.exit(0);
                        }
                        _b.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ServerlessAppsyncPlugin.prototype.getDomain = function () {
        if (!this.api) {
            throw new this.serverless.classes.Error('AppSync configuration not found');
        }
        var domain = this.api.config.domain;
        if (!domain) {
            throw new this.serverless.classes.Error('Domain configuration not found');
        }
        return domain;
    };
    ServerlessAppsyncPlugin.prototype.getDomainCertificateArn = function () {
        return __awaiter(this, void 0, void 0, function () {
            var CertificateSummaryList, domain, matches, _loop_1, _i, matches_1, match, state_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.provider.request('ACM', 'listCertificates', 
                        // only fully issued certificates
                        { CertificateStatuses: ['ISSUED'] }, 
                        // certificates must always be in us-east-1
                        { region: 'us-east-1' })];
                    case 1:
                        CertificateSummaryList = (_a.sent()).CertificateSummaryList;
                        domain = this.getDomain();
                        matches = [domain.name, (0, utils_1.getWildCardDomainName)(domain.name)];
                        _loop_1 = function (match) {
                            var cert = CertificateSummaryList === null || CertificateSummaryList === void 0 ? void 0 : CertificateSummaryList.find(function (_a) {
                                var DomainName = _a.DomainName;
                                return DomainName === match;
                            });
                            if (cert) {
                                log_1.log.info("Found matching certificate for ".concat(match, ": ").concat(cert.CertificateArn));
                                return { value: cert.CertificateArn };
                            }
                        };
                        for (_i = 0, matches_1 = matches; _i < matches_1.length; _i++) {
                            match = matches_1[_i];
                            state_1 = _loop_1(match);
                            if (typeof state_1 === "object")
                                return [2 /*return*/, state_1.value];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    ServerlessAppsyncPlugin.prototype.createDomain = function () {
        return __awaiter(this, void 0, void 0, function () {
            var domain, certificateArn, _a, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 4, , 5]);
                        domain = this.getDomain();
                        _a = domain.certificateArn;
                        if (_a) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.getDomainCertificateArn()];
                    case 1:
                        _a = (_b.sent());
                        _b.label = 2;
                    case 2:
                        certificateArn = _a;
                        if (!certificateArn) {
                            throw new this.serverless.classes.Error("No certificate found for domain ".concat(domain.name, "."));
                        }
                        return [4 /*yield*/, this.provider.request('AppSync', 'createDomainName', {
                                domainName: domain.name,
                                certificateArn: certificateArn,
                            })];
                    case 3:
                        _b.sent();
                        log_1.log.success("Domain '".concat(domain.name, "' created successfully"));
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _b.sent();
                        if (error_1 instanceof this.serverless.classes.Error &&
                            this.options.quiet) {
                            log_1.log.error(error_1.message);
                        }
                        else {
                            throw error_1;
                        }
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    ServerlessAppsyncPlugin.prototype.deleteDomain = function () {
        return __awaiter(this, void 0, void 0, function () {
            var domain, _a, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 4, , 5]);
                        domain = this.getDomain();
                        log_1.log.warning("The domain '".concat(domain.name, " will be deleted."));
                        _a = !this.options.yes;
                        if (!_a) return [3 /*break*/, 2];
                        return [4 /*yield*/, (0, utils_1.confirmAction)()];
                    case 1:
                        _a = !(_b.sent());
                        _b.label = 2;
                    case 2:
                        if (_a) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.provider.request('AppSync', 'deleteDomainName', {
                                domainName: domain.name,
                            })];
                    case 3:
                        _b.sent();
                        log_1.log.success("Domain '".concat(domain.name, "' deleted successfully"));
                        return [3 /*break*/, 5];
                    case 4:
                        error_2 = _b.sent();
                        if (error_2 instanceof this.serverless.classes.Error &&
                            this.options.quiet) {
                            log_1.log.error(error_2.message);
                        }
                        else {
                            throw error_2;
                        }
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    ServerlessAppsyncPlugin.prototype.getApiAssocStatus = function (name) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.provider.request('AppSync', 'getApiAssociation', {
                                domainName: name,
                            })];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.apiAssociation];
                    case 2:
                        error_3 = _a.sent();
                        if (error_3 instanceof this.serverless.classes.Error &&
                            error_3.providerErrorCodeExtension === 'NOT_FOUND_EXCEPTION') {
                            return [2 /*return*/, { associationStatus: 'NOT_FOUND' }];
                        }
                        throw error_3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ServerlessAppsyncPlugin.prototype.showApiAssocStatus = function (_a) {
        var _b;
        var name = _a.name, message = _a.message, desiredStatus = _a.desiredStatus;
        return __awaiter(this, void 0, void 0, function () {
            var progressInstance, status;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        progressInstance = log_1.progress.create({ message: message });
                        _c.label = 1;
                    case 1: return [4 /*yield*/, this.getApiAssocStatus(name)];
                    case 2:
                        status =
                            ((_b = (_c.sent())) === null || _b === void 0 ? void 0 : _b.associationStatus) || 'UNKNOWN';
                        if (!(status !== desiredStatus)) return [3 /*break*/, 4];
                        return [4 /*yield*/, (0, utils_1.wait)(1000)];
                    case 3:
                        _c.sent();
                        _c.label = 4;
                    case 4:
                        if (status !== desiredStatus) return [3 /*break*/, 1];
                        _c.label = 5;
                    case 5:
                        progressInstance.remove();
                        return [2 /*return*/];
                }
            });
        });
    };
    ServerlessAppsyncPlugin.prototype.assocDomain = function () {
        return __awaiter(this, void 0, void 0, function () {
            var domain, apiId, assoc, _a, message;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        domain = this.getDomain();
                        return [4 /*yield*/, this.getApiId()];
                    case 1:
                        apiId = _b.sent();
                        return [4 /*yield*/, this.getApiAssocStatus(domain.name)];
                    case 2:
                        assoc = _b.sent();
                        if (!((assoc === null || assoc === void 0 ? void 0 : assoc.associationStatus) !== 'NOT_FOUND' && (assoc === null || assoc === void 0 ? void 0 : assoc.apiId) !== apiId)) return [3 /*break*/, 5];
                        log_1.log.warning("The domain ".concat(domain.name, " is currently associated to another API (").concat(assoc === null || assoc === void 0 ? void 0 : assoc.apiId, ")"));
                        _a = !this.options.yes;
                        if (!_a) return [3 /*break*/, 4];
                        return [4 /*yield*/, (0, utils_1.confirmAction)()];
                    case 3:
                        _a = !(_b.sent());
                        _b.label = 4;
                    case 4:
                        if (_a) {
                            return [2 /*return*/];
                        }
                        return [3 /*break*/, 6];
                    case 5:
                        if ((assoc === null || assoc === void 0 ? void 0 : assoc.apiId) === apiId) {
                            log_1.log.success('The domain is already associated to this API');
                            return [2 /*return*/];
                        }
                        _b.label = 6;
                    case 6: return [4 /*yield*/, this.provider.request('AppSync', 'associateApi', {
                            domainName: domain.name,
                            apiId: apiId,
                        })];
                    case 7:
                        _b.sent();
                        message = "Associating API with domain '".concat(domain.name, "'");
                        return [4 /*yield*/, this.showApiAssocStatus({
                                name: domain.name,
                                message: message,
                                desiredStatus: 'SUCCESS',
                            })];
                    case 8:
                        _b.sent();
                        log_1.log.success("API successfully associated to domain '".concat(domain.name, "'"));
                        return [2 /*return*/];
                }
            });
        });
    };
    ServerlessAppsyncPlugin.prototype.disassocDomain = function () {
        return __awaiter(this, void 0, void 0, function () {
            var domain, apiId, assoc, _a, message;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        domain = this.getDomain();
                        return [4 /*yield*/, this.getApiId()];
                    case 1:
                        apiId = _b.sent();
                        return [4 /*yield*/, this.getApiAssocStatus(domain.name)];
                    case 2:
                        assoc = _b.sent();
                        if ((assoc === null || assoc === void 0 ? void 0 : assoc.associationStatus) === 'NOT_FOUND') {
                            log_1.log.warning("The domain ".concat(domain.name, " is currently not associated to any API"));
                            return [2 /*return*/];
                        }
                        if ((assoc === null || assoc === void 0 ? void 0 : assoc.apiId) !== apiId && !this.options.force) {
                            throw new this.serverless.classes.Error("The domain ".concat(domain.name, " is currently associated to another API (").concat(assoc === null || assoc === void 0 ? void 0 : assoc.apiId, ")\n") +
                                "Try running this command from that API's stack or stage, or use the --force / -f flag");
                        }
                        log_1.log.warning("The domain ".concat(domain.name, " will be disassociated from API '").concat(apiId, "'"));
                        _a = !this.options.yes;
                        if (!_a) return [3 /*break*/, 4];
                        return [4 /*yield*/, (0, utils_1.confirmAction)()];
                    case 3:
                        _a = !(_b.sent());
                        _b.label = 4;
                    case 4:
                        if (_a) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.provider.request('AppSync', 'disassociateApi', {
                                domainName: domain.name,
                            })];
                    case 5:
                        _b.sent();
                        message = "Disassociating API from domain '".concat(domain.name, "'");
                        return [4 /*yield*/, this.showApiAssocStatus({
                                name: domain.name,
                                message: message,
                                desiredStatus: 'NOT_FOUND',
                            })];
                    case 6:
                        _b.sent();
                        log_1.log.success("API successfully disassociated from domain '".concat(domain.name, "'"));
                        return [2 /*return*/];
                }
            });
        });
    };
    ServerlessAppsyncPlugin.prototype.getHostedZoneId = function () {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var domain, HostedZones, hostedZoneName_1, foundHostedZone;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        domain = this.getDomain();
                        if (!domain.hostedZoneId) return [3 /*break*/, 1];
                        return [2 /*return*/, domain.hostedZoneId];
                    case 1: return [4 /*yield*/, this.provider.request('Route53', 'listHostedZonesByName', {})];
                    case 2:
                        HostedZones = (_b.sent()).HostedZones;
                        hostedZoneName_1 = domain.hostedZoneName || (0, utils_1.getHostedZoneName)(domain.name);
                        foundHostedZone = (_a = HostedZones.find(function (zone) { return zone.Name === hostedZoneName_1; })) === null || _a === void 0 ? void 0 : _a.Id;
                        if (!foundHostedZone) {
                            throw new this.serverless.classes.Error("No hosted zone found for domain ".concat(domain.name));
                        }
                        return [2 /*return*/, foundHostedZone.replace('/hostedzone/', '')];
                }
            });
        });
    };
    ServerlessAppsyncPlugin.prototype.getAppSyncDomainName = function () {
        return __awaiter(this, void 0, void 0, function () {
            var domain, domainNameConfig, _a, hostedZoneId, dnsName;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        domain = this.getDomain();
                        return [4 /*yield*/, this.provider.request('AppSync', 'getDomainName', {
                                domainName: domain.name,
                            })];
                    case 1:
                        domainNameConfig = (_b.sent()).domainNameConfig;
                        _a = domainNameConfig || {}, hostedZoneId = _a.hostedZoneId, dnsName = _a.appsyncDomainName;
                        if (!hostedZoneId || !dnsName) {
                            throw new this.serverless.classes.Error("Domain ".concat(domain.name, " not found\nDid you forget to run 'sls appsync domain create'?"));
                        }
                        return [2 /*return*/, { hostedZoneId: hostedZoneId, dnsName: dnsName }];
                }
            });
        });
    };
    ServerlessAppsyncPlugin.prototype.createRecord = function () {
        return __awaiter(this, void 0, void 0, function () {
            var progressInstance, domain, appsyncDomainName, hostedZoneId, changeId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        progressInstance = log_1.progress.create({
                            message: 'Creating route53 record',
                        });
                        domain = this.getDomain();
                        return [4 /*yield*/, this.getAppSyncDomainName()];
                    case 1:
                        appsyncDomainName = _a.sent();
                        return [4 /*yield*/, this.getHostedZoneId()];
                    case 2:
                        hostedZoneId = _a.sent();
                        return [4 /*yield*/, this.changeRoute53Record('CREATE', hostedZoneId, appsyncDomainName)];
                    case 3:
                        changeId = _a.sent();
                        if (!changeId) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.checkRoute53RecordStatus(changeId)];
                    case 4:
                        _a.sent();
                        progressInstance.remove();
                        log_1.log.info("Alias record for '".concat(domain.name, "' was created in Hosted Zone '").concat(hostedZoneId, "'"));
                        log_1.log.success('Route53 record created successfuly');
                        _a.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    ServerlessAppsyncPlugin.prototype.deleteRecord = function () {
        return __awaiter(this, void 0, void 0, function () {
            var domain, appsyncDomainName, hostedZoneId, _a, progressInstance, changeId;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        domain = this.getDomain();
                        return [4 /*yield*/, this.getAppSyncDomainName()];
                    case 1:
                        appsyncDomainName = _b.sent();
                        return [4 /*yield*/, this.getHostedZoneId()];
                    case 2:
                        hostedZoneId = _b.sent();
                        log_1.log.warning("Alias record for '".concat(domain.name, "' will be deleted from Hosted Zone '").concat(hostedZoneId, "'"));
                        _a = !this.options.yes;
                        if (!_a) return [3 /*break*/, 4];
                        return [4 /*yield*/, (0, utils_1.confirmAction)()];
                    case 3:
                        _a = !(_b.sent());
                        _b.label = 4;
                    case 4:
                        if (_a) {
                            return [2 /*return*/];
                        }
                        progressInstance = log_1.progress.create({
                            message: 'Deleting route53 record',
                        });
                        return [4 /*yield*/, this.changeRoute53Record('DELETE', hostedZoneId, appsyncDomainName)];
                    case 5:
                        changeId = _b.sent();
                        if (!changeId) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.checkRoute53RecordStatus(changeId)];
                    case 6:
                        _b.sent();
                        progressInstance.remove();
                        log_1.log.info("Alias record for '".concat(domain.name, "' was deleted from Hosted Zone '").concat(hostedZoneId, "'"));
                        log_1.log.success('Route53 record deleted successfuly');
                        _b.label = 7;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    ServerlessAppsyncPlugin.prototype.checkRoute53RecordStatus = function (changeId) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.provider.request('Route53', 'getChange', { Id: changeId })];
                    case 1:
                        result = _a.sent();
                        if (!(result.ChangeInfo.Status !== 'INSYNC')) return [3 /*break*/, 3];
                        return [4 /*yield*/, (0, utils_1.wait)(1000)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        if (result.ChangeInfo.Status !== 'INSYNC') return [3 /*break*/, 0];
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ServerlessAppsyncPlugin.prototype.changeRoute53Record = function (action, hostedZoneId, domainNamConfig) {
        return __awaiter(this, void 0, void 0, function () {
            var domain, ChangeInfo, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        domain = this.getDomain();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.provider.request('Route53', 'changeResourceRecordSets', {
                                HostedZoneId: hostedZoneId,
                                ChangeBatch: {
                                    Changes: [
                                        {
                                            Action: action,
                                            ResourceRecordSet: {
                                                Name: domain.name,
                                                Type: 'A',
                                                AliasTarget: {
                                                    HostedZoneId: domainNamConfig.hostedZoneId,
                                                    DNSName: domainNamConfig.dnsName,
                                                    EvaluateTargetHealth: false,
                                                },
                                            },
                                        },
                                    ],
                                },
                            })];
                    case 2:
                        ChangeInfo = (_a.sent()).ChangeInfo;
                        return [2 /*return*/, ChangeInfo.Id];
                    case 3:
                        error_4 = _a.sent();
                        if (error_4 instanceof this.serverless.classes.Error &&
                            this.options.quiet) {
                            log_1.log.error(error_4.message);
                        }
                        else {
                            throw error_4;
                        }
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ServerlessAppsyncPlugin.prototype.displayEndpoints = function () {
        var _a, _b;
        var endpoints = this.gatheredData.apis.map(function (_a) {
            var type = _a.type, uri = _a.uri;
            return "".concat(type, ": ").concat(uri);
        });
        if (endpoints.length === 0) {
            return;
        }
        var name = (((_b = (_a = this.api) === null || _a === void 0 ? void 0 : _a.config) === null || _b === void 0 ? void 0 : _b.domain) || {}).name;
        if (name) {
            endpoints.push("graphql: https://".concat(name, "/graphql"));
            endpoints.push("realtime: wss://".concat(name, "/graphql/realtime"));
        }
        this.serverless.addServiceOutputSection('appsync endpoints', endpoints.sort());
    };
    ServerlessAppsyncPlugin.prototype.displayApiKeys = function () {
        var conceal = this.options.conceal;
        var apiKeys = this.gatheredData.apiKeys.map(function (_a) {
            var description = _a.description, value = _a.value;
            return "".concat(value, " (").concat(description, ")");
        });
        if (apiKeys.length === 0) {
            return;
        }
        if (!conceal) {
            this.serverless.addServiceOutputSection('appsync api keys', apiKeys);
        }
    };
    ServerlessAppsyncPlugin.prototype.loadConfig = function () {
        log_1.log.info('Loading AppSync config');
        var appSync = this.serverless.configurationInput.appSync;
        try {
            (0, validation_1.validateConfig)(appSync);
        }
        catch (error) {
            if (error instanceof validation_1.AppSyncValidationError) {
                this.handleConfigValidationError(error);
            }
            else {
                throw error;
            }
        }
        var config = (0, getAppSyncConfig_1.getAppSyncConfig)(appSync);
        this.naming = new Naming_1.Naming(appSync.name);
        this.api = new Api_1.Api(config, this);
    };
    ServerlessAppsyncPlugin.prototype.validateSchemas = function () {
        try {
            log_1.log.info('Validating AppSync schema');
            if (!this.api) {
                throw new this.serverless.classes.Error('Could not load the API. This should not happen.');
            }
            this.api.compileSchema();
        }
        catch (error) {
            log_1.log.info('Error');
            if (error instanceof graphql_1.GraphQLError) {
                this.handleError(error.message);
            }
            throw error;
        }
    };
    ServerlessAppsyncPlugin.prototype.buildAndAppendResources = function () {
        if (!this.api) {
            throw new this.serverless.classes.Error('Could not load the API. This should not happen.');
        }
        var resources = this.api.compile();
        (0, lodash_1.merge)(this.serverless.service, {
            functions: this.api.functions,
            resources: { Resources: resources },
        });
        this.serverless.service.setFunctionNames(this.serverless.processedInput.options);
    };
    ServerlessAppsyncPlugin.prototype.handleConfigValidationError = function (error) {
        var errors = error.validationErrors.map(function (error) { return "     at appSync".concat(error.path, ": ").concat(error.message); });
        var message = "Invalid AppSync Configuration:\n".concat(errors.join('\n'));
        this.handleError(message);
    };
    ServerlessAppsyncPlugin.prototype.handleError = function (message) {
        var configValidationMode = this.serverless.service.configValidationMode;
        if (configValidationMode === 'error') {
            throw new this.serverless.classes.Error(message);
        }
        else if (configValidationMode === 'warn') {
            log_1.log.warning(message);
        }
    };
    return ServerlessAppsyncPlugin;
}());
module.exports = ServerlessAppsyncPlugin;
//# sourceMappingURL=index.js.map