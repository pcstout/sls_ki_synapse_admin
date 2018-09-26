import * as Request from 'request-promise';
import * as Url from 'url';
import * as Crypto from 'crypto';
import { SynapseEntityTypes } from './synapseEntityTypes';
import { SynapsePermissions } from './synapsePermissions';
import { SynapsePermissionSets } from './synapsePermissionSets';

export class SynapseClient {

  private static sessionToken: string = null;

  // Base URL of Synapse API.
  private static readonly apiUrl: string = 'https://repo-prod.prod.sagebase.org';

  // Create a Synapse Project
  public static createProject(name: string): Promise<Object> {
    return SynapseClient._createEntity(SynapseEntityTypes.Project, { name: name });
  }

  // Gets a Synapse Project.
  public static getProject(projectId: string): Promise<Object> {
    return SynapseClient._get(`repo/v1/entity/${projectId}`);
  }

  // Delete a Synapse Project
  public static deleteProject(projectId: string): Promise<Object> {
    return SynapseClient._delete(`repo/v1/entity/${projectId}`);
  }

  // Create a Synapse Team
  public static async createTeam(name: string): Promise<Object> {
    return SynapseClient._post('repo/v1/team', { name: name });
  }

  // Gets a Synapse Team
  public static async getTeam(id_or_name: any): Promise<Object> {
    let teamId = id_or_name;

    if (!SynapseClient._isInt(id_or_name)) {
      teamId = await SynapseClient._findTeamId(id_or_name);
    }

    return SynapseClient._get(`repo/v1/team/${teamId}`);
  }

  // Delete a Synapse Team
  public static async deleteTeam(teamId: string): Promise<Object> {
    return SynapseClient._delete(`repo/v1/team/${teamId}`);
  }

  // Gets a user by username
  public static async getUser(id_or_username: any): Promise<Object> {
    let userId = id_or_username;

    if (!SynapseClient._isInt(id_or_username)) {
      userId = await SynapseClient._findUserId(id_or_username);
    }

    return SynapseClient._get(`repo/v1/userProfile/${userId}`);
  }

  // Gets the ACL for a Synapse Entity
  public static async getEntityAcl(entityId: string): Promise<Object> {
    return SynapseClient._get(`repo/v1/entity/${entityId}/acl`);
  }

  // Gets the permissions for a Synapse Entity
  public static async getPermissions(entityId: string, principalId: number): Promise<string[]> {
    await SynapseClient._ensureLoggedIn();

    const acl = await SynapseClient.getEntityAcl(entityId);

    let result = [];

    acl['resourceAccess'].forEach(item => {
      if (item['principalId'] == principalId) {
        result = item['accessType'];
        return;
      }
    });

    return result;
  }

  // Sets the permissions for a Synapse Entity
  public static async setPermissions(entityId: string, principalId: string, permissions: string[]): Promise<Object> {
    let acl = await SynapseClient.getEntityAcl(entityId);

    let existingPermissions = null;

    acl['resourceAccess'].forEach((item) => {
      if (item['principalId'] == principalId) {
        existingPermissions = item;
        return;
      }
    });

    if (!permissions || permissions.length == 0) {
      // Delete the permissions
      acl['resourceAccess'] = acl['resourceAccess'].filter((item) => {
        return item != existingPermissions;
      });
    } else if (existingPermissions) {
      // Update the permissions
      existingPermissions['accessType'] = permissions;
    } else {
      // Add new permissions
      acl['resourceAccess'].push({
        "accessType": permissions,
        "principalId": principalId
      });
    }

    return SynapseClient._put(`repo/v1/entity/${entityId}/acl`, acl);
  }

  // Finds a Synapse User's ID by username
  private static async _findUserId(username: string): Promise<Object> {
    const users = await SynapseClient._get(`repo/v1/userGroupHeaders?prefix=${username}`);

    let result = undefined;

    users['children'].forEach((user) => {
      if (user['userName'] === username) {
        result = user['ownerId'];
        return;
      }
    });

    return result;
  }

  // Finds a Synapse Team's ID by Name
  private static async _findTeamId(name: string): Promise<Object> {
    const teams = await SynapseClient._get(`repo/v1/teams?fragment=${name}`)
    let result = undefined

    teams['results'].forEach((team) => {
      if (team['name'] === name) {
        result = team['id'];
        return;
      }
    });

    return result
  }

  // Create a Synapse Entity
  private static _createEntity(entityType: SynapseEntityTypes, body: Object): Promise<Object> {
    body['concreteType'] = entityType;
    return SynapseClient._post('repo/v1/entity', body);
  }

  // Gets signed request headers for authenticating a Synapse API request.
  private static _getSignedAuthHeaders(fullUrl: string, useSessionToken: boolean = true): Object {
    if (useSessionToken) {
      return {
        "Access-Control-Request-Headers": "sessiontoken",
        "sessionToken": SynapseClient.sessionToken
      }
    } else {
      const apiKey = process.env.SYNAPSE_API_KEY;
      const username = process.env.SYNAPSE_USERNAME;

      const timestamp = new Date(new Date().toUTCString()).toISOString();

      let urlPath = Url.parse(fullUrl).path;

      const signature_data = username + urlPath + timestamp;

      const hmac = Crypto.createHmac('sha1', apiKey).update(signature_data);
      const signature = hmac.digest('base64');

      return {
        "userId": username,
        "signatureTimestamp": timestamp,
        "signature": signature
      };
    }
  }

  // Ensures we are logged into Synapse and have a Session Token
  private static async _ensureLoggedIn(): Promise<string> {
    if (!SynapseClient.sessionToken) {
      const username = process.env.SYNAPSE_USERNAME;
      const password = process.env.SYNAPSE_PASSWORD;

      const url = `${SynapseClient.apiUrl}/auth/v1/login`;

      const options = {
        uri: url,
        json: true,
        body: { username: username, password: password }
      };

      const auth = await Request.post(options).catch(SynapseClient._logRequestError);

      SynapseClient.sessionToken = auth['sessionToken'];
    }

    return SynapseClient.sessionToken;
  }

  // Executes a GET request to Synapse.
  private static async _get(path: string): Promise<Object> {
    await SynapseClient._ensureLoggedIn();

    const url = `${SynapseClient.apiUrl}/${path}`;

    const options = {
      uri: url,
      headers: await SynapseClient._getSignedAuthHeaders(url),
      json: true
    };

    return Request.get(options).catch(SynapseClient._logRequestError);
  }

  // Executes a POST request to Synapse.
  private static async _post(path: string, body: Object): Promise<Object> {
    return SynapseClient._postOrPut('POST', path, body);
  }

  // Executes a PUT request to Synapse.
  private static async _put(path: string, body: Object): Promise<Object> {
    return SynapseClient._postOrPut('PUT', path, body);
  }

  // Executes a POST or PUT request to Synapse.
  private static async _postOrPut(method: string, path: string, body: Object): Promise<Object> {
    await SynapseClient._ensureLoggedIn();

    const url = `${SynapseClient.apiUrl}/${path}`;

    const options = {
      method: method,
      uri: url,
      headers: SynapseClient._getSignedAuthHeaders(url),
      json: true,
      body: body
    };

    return Request(options).catch(SynapseClient._logRequestError);
  }

  // Executes a DELETE request to Synapse.
  private static async _delete(path: string): Promise<Object> {
    await SynapseClient._ensureLoggedIn();

    const url = `${SynapseClient.apiUrl}/${path}`;

    const options = {
      uri: url,
      headers: await SynapseClient._getSignedAuthHeaders(url),
      json: true
    };

    return Request.delete(options).catch(SynapseClient._logRequestError);
  }

  private static _logRequestError(error: any): void {
    console.log(error);
  };

  // Gets if a value is a Number
  private static _isInt(value: any): boolean {
    const parsed = parseInt(value);
    return !isNaN(parsed);
  }

}
