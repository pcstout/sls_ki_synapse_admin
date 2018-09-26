import { SynapseClient } from '../../src/synapse/synapseClient';
import { onPossiblyUnhandledRejection } from 'bluebird';
import { SynapsePermissionSets } from './synapsePermissionSets';
import * as Crypto from 'crypto';

const _testId = Crypto.randomBytes(16).toString("hex");
const _testUsername = process.env.SYNAPSE_USERNAME;
let _testUser = null;
let _testProject = null;
let _testTeam = null;
let _projects = [];
let _teams = [];

beforeAll(async () => {
  _testUser = await SynapseClient.getUser(_testUsername);
  _testProject = await _newProject();
  _testTeam = await _newTeam();
});

afterAll(async () => {

  _teams.forEach(async team => {
    await SynapseClient.deleteTeam(team['id']);
  });

  _projects.forEach(async project => {
    await SynapseClient.deleteProject(project['id']);
  });

});

// Creates a new Synapse Project
async function _newProject(): Promise<Object> {
  const p = await SynapseClient.createProject(_getUniqName());
  _projects.push(p);
  return p;
}

// Creates a new Synapse Team
async function _newTeam(): Promise<Object> {
  const t = await SynapseClient.createTeam(_getUniqName());
  _teams.push(t);
  return t;
}

// Gets a unique name to use for Synapse object names.
function _getUniqName(): string {
  return `__TEST__${_testId}__${new Date().getTime()}`;
}

describe('Projects', () => {

  test('create a project', async () => {
    const projectName = _getUniqName();

    return SynapseClient.createProject(projectName).then(async (result) => {
      _projects.push(result);
      expect(result['name']).toEqual(projectName);
    });
  });

  test('get a project', async () => {
    const projectId = _testProject['id'];

    return SynapseClient.getProject(projectId).then((result) => {
      expect(result['id']).toEqual(projectId);
    });
  });

  test('delete a project', async () => {
    const project = await _newProject();

    return SynapseClient.deleteProject(project['id']).then((result) => {
      expect(result).not.toBe({});
    });
  });

});

describe('Teams', () => {

  test('create a team', async () => {
    const teamName = _getUniqName();

    return SynapseClient.createTeam(teamName).then(async (result) => {
      _teams.push(result);
      expect(result['name']).toEqual(teamName);
    });
  });

  test('delete a team', async () => {
    const team = await _newTeam();

    return SynapseClient.deleteTeam(team['id']).then((result) => {
      expect(result).not.toBe({});
    });
  });

  test('get a team by ID', async () => {
    const teamId = _testTeam['id'];

    return SynapseClient.getTeam(teamId).then((result) => {
      expect(result['id']).toEqual(teamId);
    });
  });

  test('get a team by Name', async () => {
    const teamId = _testTeam['id'];
    const teamName = _testTeam['name'];

    return SynapseClient.getTeam(teamName).then((result) => {
      expect(result['id']).toEqual(teamId);
      expect(result['name']).toEqual(teamName);
    });
  });

});

describe('Users', () => {

  test('get a user by username', async () => {
    return SynapseClient.getUser(_testUsername).then((result) => {
      expect(result).not.toBe({});
      expect(result['userName']).toEqual(_testUsername);
    });
  });

  test('get a user by ID', async () => {
    const userId = _testUser['ownerId'];

    return SynapseClient.getUser(userId).then((result) => {
      expect(result).not.toBe({});
      expect(result['ownerId']).toEqual(userId);
    });
  });

});

describe('Access Control', () => {

  test('get entity ACL', async () => {
    const projectId = _testProject['id'];

    return SynapseClient.getEntityAcl(projectId).then((acl) => {
      expect(acl).not.toBe({});
    });
  });

  test('get permissions for a user', async () => {
    const projectId = _testProject['id'];
    const principalId = _testUser['ownerId'];

    return SynapseClient.getPermissions(projectId, principalId).then((currentPermissions) => {
      expect(currentPermissions.sort()).toEqual(SynapsePermissionSets.Admin.sort());
    });
  });

  test('get permissions for a team', async () => {
    const project = await _newProject();
    const projectId = project['id'];
    const principalId = _testTeam['id'];

    await SynapseClient.getPermissions(projectId, principalId).then(async (currentPermissions) => {
      expect(currentPermissions).toEqual([]);
    });

    // Add some permissions so there is something to get.
    await SynapseClient.setPermissions(projectId, principalId, SynapsePermissionSets.CanEdit).then(async (result) => {
      expect(result).toBeDefined();
    })

    return SynapseClient.getPermissions(projectId, principalId).then((currentPermissions) => {
      expect(currentPermissions.sort()).toEqual(SynapsePermissionSets.CanEdit.sort());
    });
  });

  test('set permissions', async () => {
    const projectId = _testProject['id'];
    const principalId = _testTeam['id'];

    const permissionSet = SynapsePermissionSets.CanEdit;

    await SynapseClient.getPermissions(projectId, principalId).then(async (currentPermissions) => {
      expect(currentPermissions).toEqual([]);
    });

    return SynapseClient.setPermissions(projectId, principalId, permissionSet).then(async (result) => {
      expect(result).not.toBe({});

      await SynapseClient.getPermissions(projectId, principalId).then(async (currentPermissions) => {
        expect(currentPermissions.sort()).toEqual(permissionSet.sort());
      });
    });

  });

  test('change permissions', async () => {
    const project = await _newProject();
    const projectId = project['id'];
    const team = await _newTeam();
    const principalId = team['id'];

    const permissionSets = [
      SynapsePermissionSets.CanEdit,
      SynapsePermissionSets.CanEditAndDelete,
      SynapsePermissionSets.Admin
    ];

    let lastPerms = [];

    for (const permissionSet of permissionSets) {

      await SynapseClient.setPermissions(projectId, principalId, permissionSet).then(async (result) => {
        expect(result).toBeDefined();
      });

      await SynapseClient.getPermissions(projectId, principalId).then(async (currentPermissions) => {
        expect(currentPermissions.sort()).toEqual(permissionSet.sort());
        expect(currentPermissions.sort()).not.toEqual(lastPerms.sort());

        lastPerms = currentPermissions;
      });
    }

  });

  test('remove permissions', async () => {
    const projectId = _testProject['id'];
    const principalId = _testTeam['id'];

    const permissionSet = SynapsePermissionSets.CanEdit;

    await SynapseClient.setPermissions(projectId, principalId, permissionSet).then(async (result) => {
      expect(result).toBeDefined();

      await SynapseClient.getPermissions(projectId, principalId).then(async (currentPermissions) => {
        expect(currentPermissions.sort()).toEqual(permissionSet.sort());
      });

    });

    return SynapseClient.setPermissions(projectId, principalId, []).then(async (result) => {
      expect(result).toBeDefined();

      await SynapseClient.getPermissions(projectId, principalId).then(async (currentPermissions) => {
        expect(currentPermissions).toEqual([]);
      });

    });

  });

});
