import { SynapsePermissions } from './synapsePermissions';

export class SynapsePermissionSets {

  public static readonly Admin: string[] = [
    SynapsePermissions.Update,
    SynapsePermissions.Delete,
    SynapsePermissions.ChangePermissions,
    SynapsePermissions.ChangeSettings,
    SynapsePermissions.Create,
    SynapsePermissions.Download,
    SynapsePermissions.Read,
    SynapsePermissions.Moderate
  ];
  
  public static readonly CanEditAndDelete: string[] = [
    SynapsePermissions.Download,
    SynapsePermissions.Update,
    SynapsePermissions.Create,
    SynapsePermissions.Delete,
    SynapsePermissions.Read
  ];

  public static readonly CanEdit: string[] = [
    SynapsePermissions.Download,
    SynapsePermissions.Update,
    SynapsePermissions.Create,
    SynapsePermissions.Read
  ];
}
