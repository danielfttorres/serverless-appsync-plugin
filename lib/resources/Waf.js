"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Waf = void 0;
var lodash_1 = require("lodash");
var Waf = /** @class */ (function () {
    function Waf(api, config) {
        this.api = api;
        this.config = config;
    }
    Waf.prototype.compile = function () {
        var _a, _b, _c;
        var wafConfig = this.config;
        if (wafConfig.enabled === false) {
            return {};
        }
        var apiLogicalId = this.api.naming.getApiLogicalId();
        var wafAssocLogicalId = this.api.naming.getWafAssociationLogicalId();
        if (wafConfig.arn) {
            return _a = {},
                _a[wafAssocLogicalId] = {
                    Type: 'AWS::WAFv2::WebACLAssociation',
                    Properties: {
                        ResourceArn: { 'Fn::GetAtt': [apiLogicalId, 'Arn'] },
                        WebACLArn: wafConfig.arn,
                    },
                },
                _a;
        }
        var name = wafConfig.name || "".concat(this.api.config.name, "Waf");
        var wafLogicalId = this.api.naming.getWafLogicalId();
        var defaultActionSource = wafConfig.defaultAction || 'Allow';
        var defaultAction = typeof defaultActionSource === 'string'
            ? (_b = {}, _b[defaultActionSource] = {}, _b) : defaultActionSource;
        return _c = {},
            _c[wafLogicalId] = {
                Type: 'AWS::WAFv2::WebACL',
                Properties: {
                    DefaultAction: defaultAction,
                    Scope: 'REGIONAL',
                    Description: wafConfig.description ||
                        "ACL rules for AppSync ".concat(this.api.config.name),
                    Name: name,
                    Rules: this.buildWafRules(),
                    VisibilityConfig: this.getWafVisibilityConfig(this.config.visibilityConfig, name),
                    Tags: this.api.getTagsConfig(),
                },
            },
            _c[wafAssocLogicalId] = {
                Type: 'AWS::WAFv2::WebACLAssociation',
                Properties: {
                    ResourceArn: { 'Fn::GetAtt': [apiLogicalId, 'Arn'] },
                    WebACLArn: { 'Fn::GetAtt': [wafLogicalId, 'Arn'] },
                },
            },
            _c;
    };
    Waf.prototype.buildWafRules = function () {
        var _this = this;
        var rules = this.config.rules || [];
        var defaultPriority = 100;
        return rules
            .map(function (rule) { return _this.buildWafRule(rule); })
            .concat(this.buildApiKeysWafRules())
            .map(function (rule) { return (__assign(__assign({}, rule), { Priority: rule.Priority || defaultPriority++ })); });
    };
    Waf.prototype.buildWafRule = function (rule, defaultNamePrefix) {
        var _a;
        // Throttle pre-set rule
        if (rule === 'throttle') {
            return this.buildThrottleRule({}, defaultNamePrefix);
        }
        else if (typeof rule === 'object' && 'throttle' in rule) {
            return this.buildThrottleRule(rule.throttle, defaultNamePrefix);
        }
        // Disable Introspection pre-set rule
        if (rule === 'disableIntrospection') {
            return this.buildDisableIntrospectionRule({}, defaultNamePrefix);
        }
        else if ('disableIntrospection' in rule) {
            return this.buildDisableIntrospectionRule(rule.disableIntrospection, defaultNamePrefix);
        }
        var action = rule.action || 'Allow';
        var result = {
            Name: rule.name,
            Action: (_a = {}, _a[action] = {}, _a),
            Priority: rule.priority,
            Statement: rule.statement,
            VisibilityConfig: this.getWafVisibilityConfig(rule.visibilityConfig, rule.name),
        };
        return result;
    };
    Waf.prototype.buildApiKeysWafRules = function () {
        var _this = this;
        return ((0, lodash_1.reduce)(this.api.config.apiKeys, function (rules, key) { return rules.concat(_this.buildApiKeyRules(key)); }, []) || []);
    };
    Waf.prototype.buildApiKeyRules = function (key) {
        var _this = this;
        var rules = key.wafRules;
        // Build the rule and add a matching rule for the X-Api-Key header
        // for the given api key
        var allRules = [];
        rules === null || rules === void 0 ? void 0 : rules.forEach(function (keyRule) {
            var _a;
            var builtRule = _this.buildWafRule(keyRule, key.name);
            var logicalIdApiKey = _this.api.naming.getApiKeyLogicalId(key.name);
            var baseStatement = builtRule.Statement;
            var apiKeyStatement = {
                ByteMatchStatement: {
                    FieldToMatch: {
                        SingleHeader: { Name: 'X-Api-key' },
                    },
                    PositionalConstraint: 'EXACTLY',
                    SearchString: { 'Fn::GetAtt': [logicalIdApiKey, 'ApiKey'] },
                    TextTransformations: [
                        {
                            Type: 'LOWERCASE',
                            Priority: 0,
                        },
                    ],
                },
            };
            var statement;
            if (baseStatement && (baseStatement === null || baseStatement === void 0 ? void 0 : baseStatement.RateBasedStatement)) {
                var ScopeDownStatement = void 0;
                // For RateBasedStatement, use the api rule as ScopeDownStatement
                // merge if with existing needed
                if ((_a = baseStatement.RateBasedStatement) === null || _a === void 0 ? void 0 : _a.ScopeDownStatement) {
                    ScopeDownStatement = _this.mergeWafRuleStatements([
                        baseStatement.RateBasedStatement.ScopeDownStatement,
                        apiKeyStatement,
                    ]);
                }
                else {
                    ScopeDownStatement = apiKeyStatement;
                }
                // RateBasedStatement
                statement = {
                    RateBasedStatement: __assign(__assign({}, baseStatement.RateBasedStatement), { ScopeDownStatement: ScopeDownStatement }),
                };
            }
            else if (!(0, lodash_1.isEmpty)(baseStatement)) {
                // Other rules: combine them (And Statement)
                statement = _this.mergeWafRuleStatements([
                    baseStatement,
                    apiKeyStatement,
                ]);
            }
            else {
                // No statement, the rule is the API key rule itself
                statement = apiKeyStatement;
            }
            allRules.push(__assign(__assign({}, builtRule), { Statement: statement }));
        });
        return allRules;
    };
    Waf.prototype.mergeWafRuleStatements = function (statements) {
        return {
            AndStatement: {
                Statements: statements,
            },
        };
    };
    Waf.prototype.getWafVisibilityConfig = function (visibilityConfig, defaultName) {
        var _a, _b, _c, _d, _e, _f;
        if (visibilityConfig === void 0) { visibilityConfig = {}; }
        return {
            CloudWatchMetricsEnabled: (_c = (_a = visibilityConfig.cloudWatchMetricsEnabled) !== null && _a !== void 0 ? _a : (_b = this.config.visibilityConfig) === null || _b === void 0 ? void 0 : _b.cloudWatchMetricsEnabled) !== null && _c !== void 0 ? _c : true,
            MetricName: visibilityConfig.name || defaultName,
            SampledRequestsEnabled: (_f = (_d = visibilityConfig.sampledRequestsEnabled) !== null && _d !== void 0 ? _d : (_e = this.config.visibilityConfig) === null || _e === void 0 ? void 0 : _e.sampledRequestsEnabled) !== null && _f !== void 0 ? _f : true,
        };
    };
    Waf.prototype.buildDisableIntrospectionRule = function (config, defaultNamePrefix) {
        var Name = config.name || "".concat(defaultNamePrefix || '', "DisableIntrospection");
        return {
            Action: {
                Block: {},
            },
            Name: Name,
            Priority: config.priority,
            Statement: {
                OrStatement: {
                    Statements: [
                        {
                            // Block all requests > 8kb
                            // https://docs.aws.amazon.com/waf/latest/developerguide/web-request-body-inspection.html
                            SizeConstraintStatement: {
                                ComparisonOperator: 'GT',
                                FieldToMatch: {
                                    Body: {},
                                },
                                Size: 8 * 1024,
                                TextTransformations: [
                                    {
                                        Type: 'NONE',
                                        Priority: 0,
                                    },
                                ],
                            },
                        },
                        {
                            ByteMatchStatement: {
                                FieldToMatch: {
                                    Body: {},
                                },
                                PositionalConstraint: 'CONTAINS',
                                SearchString: '__schema',
                                TextTransformations: [
                                    {
                                        Type: 'COMPRESS_WHITE_SPACE',
                                        Priority: 0,
                                    },
                                ],
                            },
                        },
                    ],
                },
            },
            VisibilityConfig: this.getWafVisibilityConfig(typeof config === 'object' ? config.visibilityConfig : undefined, Name),
        };
    };
    Waf.prototype.buildThrottleRule = function (config, defaultNamePrefix) {
        var _a, _b;
        var Name = "".concat(defaultNamePrefix || '', "Throttle");
        var Limit = 100;
        var AggregateKeyType = 'IP';
        var ForwardedIPConfig;
        var Priority;
        var ScopeDownStatement;
        if (typeof config === 'number') {
            Limit = config;
        }
        else if (typeof config === 'object') {
            Name = config.name || Name;
            AggregateKeyType = config.aggregateKeyType || AggregateKeyType;
            Limit = config.limit || Limit;
            Priority = config.priority;
            ScopeDownStatement = config.scopeDownStatement;
            if (AggregateKeyType === 'FORWARDED_IP') {
                ForwardedIPConfig = {
                    HeaderName: ((_a = config.forwardedIPConfig) === null || _a === void 0 ? void 0 : _a.headerName) || 'X-Forwarded-For',
                    FallbackBehavior: ((_b = config.forwardedIPConfig) === null || _b === void 0 ? void 0 : _b.fallbackBehavior) || 'MATCH',
                };
            }
        }
        return {
            Action: {
                Block: {},
            },
            Name: Name,
            Priority: Priority,
            Statement: {
                RateBasedStatement: {
                    AggregateKeyType: AggregateKeyType,
                    Limit: Limit,
                    ForwardedIPConfig: ForwardedIPConfig,
                    ScopeDownStatement: ScopeDownStatement,
                },
            },
            VisibilityConfig: this.getWafVisibilityConfig(typeof config === 'object' ? config.visibilityConfig : undefined, Name),
        };
    };
    return Waf;
}());
exports.Waf = Waf;
//# sourceMappingURL=Waf.js.map