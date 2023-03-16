export interface ConfigGroup
{
    members: string[];
    required?: number;
    paths?: string[];
}

export interface Config
{
    groups: { [groupName: string]: ConfigGroup };
}