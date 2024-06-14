import Serverless from 'serverless/lib/Serverless';
import { CommandsDefinition, Hook, VariablesSourcesDefinition, VariableSourceResolver } from 'serverless';
import { AppSyncValidationError } from './validation';
declare class ServerlessAppsyncPlugin {
    serverless: Serverless;
    private options;
    private provider;
    private gatheredData;
    readonly hooks: Record<string, Hook>;
    readonly commands?: CommandsDefinition;
    readonly configurationVariablesSources?: VariablesSourcesDefinition;
    private api?;
    private naming?;
    constructor(serverless: Serverless, options: Record<string, string>);
    getApiId(): Promise<any>;
    gatherData(): Promise<void>;
    getIntrospection(): Promise<void>;
    flushCache(): Promise<void>;
    openConsole(): Promise<void>;
    openCloudWatch(): Promise<void>;
    initShowLogs(): Promise<void>;
    showLogs(logGroupName: string, nextToken?: string): Promise<void>;
    initDomainCommand(): Promise<void>;
    getDomain(): import("./types").DomainConfig;
    getDomainCertificateArn(): Promise<string | undefined>;
    createDomain(): Promise<void>;
    deleteDomain(): Promise<void>;
    getApiAssocStatus(name: string): Promise<import("aws-sdk/clients/appsync").ApiAssociation | undefined>;
    showApiAssocStatus({ name, message, desiredStatus, }: {
        name: string;
        message: string;
        desiredStatus: 'SUCCESS' | 'NOT_FOUND';
    }): Promise<void>;
    assocDomain(): Promise<void>;
    disassocDomain(): Promise<void>;
    getHostedZoneId(): Promise<string>;
    getAppSyncDomainName(): Promise<{
        hostedZoneId: string;
        dnsName: string;
    }>;
    createRecord(): Promise<void>;
    deleteRecord(): Promise<void>;
    checkRoute53RecordStatus(changeId: string): Promise<void>;
    changeRoute53Record(action: 'CREATE' | 'DELETE', hostedZoneId: string, domainNamConfig: {
        hostedZoneId: string;
        dnsName: string;
    }): Promise<string | undefined>;
    displayEndpoints(): void;
    displayApiKeys(): void;
    loadConfig(): void;
    validateSchemas(): void;
    buildAndAppendResources(): void;
    resolveVariable: VariableSourceResolver;
    handleConfigValidationError(error: AppSyncValidationError): void;
    handleError(message: string): void;
}
export = ServerlessAppsyncPlugin;
