import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { teamService } from '../services/api/team';
import { socketService } from '../services/api/socket';
import {
  TeamMember,
  TeamMemberSummary,
  CurrentUserTeam,
  MerchantRole,
  TeamMemberStatus,
  Permission,
  InviteTeamMemberRequest,
  UpdateTeamMemberRoleRequest,
  UpdateTeamMemberStatusRequest
} from '../types/team';

// ============================================================================
// STATE & ACTION TYPES
// ============================================================================

interface TeamState {
  // Team members
  members: TeamMemberSummary[];
  membersById: Record<string, TeamMemberSummary>;

  // Current user's team info
  currentUserRole: MerchantRole | null;
  currentUserPermissions: Permission[];

  // Loading states
  isLoadingMembers: boolean;
  isLoadingPermissions: boolean;

  // Error states
  error: string | null;

  // Optimistic updates tracking
  pendingOperations: Set<string>;

  // Metadata
  totalMembers: number;
  lastFetchedAt: string | null;
}

type TeamAction =
  | { type: 'FETCH_MEMBERS_START' }
  | { type: 'FETCH_MEMBERS_SUCCESS'; payload: { members: TeamMemberSummary[]; total: number } }
  | { type: 'FETCH_MEMBERS_ERROR'; payload: string }
  | { type: 'FETCH_PERMISSIONS_START' }
  | { type: 'FETCH_PERMISSIONS_SUCCESS'; payload: CurrentUserTeam }
  | { type: 'FETCH_PERMISSIONS_ERROR'; payload: string }
  | { type: 'ADD_MEMBER_OPTIMISTIC'; payload: TeamMemberSummary }
  | { type: 'ADD_MEMBER_SUCCESS'; payload: TeamMemberSummary }
  | { type: 'ADD_MEMBER_ROLLBACK'; payload: string }
  | { type: 'UPDATE_MEMBER_ROLE_OPTIMISTIC'; payload: { userId: string; role: MerchantRole } }
  | { type: 'UPDATE_MEMBER_ROLE_SUCCESS'; payload: { userId: string; role: MerchantRole; permissions: Permission[] } }
  | { type: 'UPDATE_MEMBER_ROLE_ROLLBACK'; payload: { userId: string; oldRole: MerchantRole } }
  | { type: 'UPDATE_MEMBER_STATUS_OPTIMISTIC'; payload: { userId: string; status: TeamMemberStatus } }
  | { type: 'UPDATE_MEMBER_STATUS_SUCCESS'; payload: { userId: string; status: TeamMemberStatus } }
  | { type: 'UPDATE_MEMBER_STATUS_ROLLBACK'; payload: { userId: string; oldStatus: TeamMemberStatus } }
  | { type: 'REMOVE_MEMBER_OPTIMISTIC'; payload: string }
  | { type: 'REMOVE_MEMBER_SUCCESS'; payload: string }
  | { type: 'REMOVE_MEMBER_ROLLBACK'; payload: TeamMemberSummary }
  | { type: 'UPDATE_MEMBER_REALTIME'; payload: TeamMemberSummary }
  | { type: 'REMOVE_MEMBER_REALTIME'; payload: string }
  | { type: 'START_OPERATION'; payload: string }
  | { type: 'END_OPERATION'; payload: string }
  | { type: 'CLEAR_ERROR' };

interface TeamContextType {
  state: TeamState;

  // Team members
  members: TeamMemberSummary[];
  totalMembers: number;

  // Current user
  currentUserRole: MerchantRole | null;
  currentUserPermissions: Permission[];

  // Loading states
  isLoadingMembers: boolean;
  isLoadingPermissions: boolean;

  // Actions
  fetchTeamMembers: () => Promise<void>;
  fetchCurrentUserPermissions: () => Promise<void>;
  inviteMember: (data: InviteTeamMemberRequest) => Promise<void>;
  updateMemberRole: (userId: string, role: Exclude<MerchantRole, 'owner'>) => Promise<void>;
  updateMemberStatus: (userId: string, status: TeamMemberStatus) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  suspendMember: (userId: string) => Promise<void>;
  activateMember: (userId: string) => Promise<void>;
  resendInvitation: (userId: string) => Promise<void>;

  // Permission checking
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  canEditMember: (targetRole: MerchantRole) => boolean;

  // Utilities
  getMember: (userId: string) => TeamMemberSummary | undefined;
  clearError: () => void;
  refreshTeam: () => Promise<void>;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: TeamState = {
  members: [],
  membersById: {},
  currentUserRole: null,
  currentUserPermissions: [],
  isLoadingMembers: true,
  isLoadingPermissions: true,
  error: null,
  pendingOperations: new Set(),
  totalMembers: 0,
  lastFetchedAt: null
};

// ============================================================================
// REDUCER
// ============================================================================

function teamReducer(state: TeamState, action: TeamAction): TeamState {
  switch (action.type) {
    case 'FETCH_MEMBERS_START':
      return {
        ...state,
        isLoadingMembers: true,
        error: null
      };

    case 'FETCH_MEMBERS_SUCCESS': {
      const membersById: Record<string, TeamMemberSummary> = {};
      action.payload.members.forEach(member => {
        membersById[member.id] = member;
      });

      return {
        ...state,
        members: action.payload.members,
        membersById,
        totalMembers: action.payload.total,
        isLoadingMembers: false,
        error: null,
        lastFetchedAt: new Date().toISOString()
      };
    }

    case 'FETCH_MEMBERS_ERROR':
      return {
        ...state,
        isLoadingMembers: false,
        error: action.payload
      };

    case 'FETCH_PERMISSIONS_START':
      return {
        ...state,
        isLoadingPermissions: true,
        error: null
      };

    case 'FETCH_PERMISSIONS_SUCCESS':
      return {
        ...state,
        currentUserRole: action.payload.role,
        currentUserPermissions: action.payload.permissions,
        isLoadingPermissions: false,
        error: null
      };

    case 'FETCH_PERMISSIONS_ERROR':
      return {
        ...state,
        isLoadingPermissions: false,
        error: action.payload
      };

    case 'ADD_MEMBER_OPTIMISTIC': {
      const newMembersById = {
        ...state.membersById,
        [action.payload.id]: action.payload
      };

      return {
        ...state,
        members: [...state.members, action.payload],
        membersById: newMembersById,
        totalMembers: state.totalMembers + 1
      };
    }

    case 'ADD_MEMBER_SUCCESS': {
      // Update the member with actual server data
      const updatedMembersById = {
        ...state.membersById,
        [action.payload.id]: action.payload
      };

      const updatedMembers = state.members.map(m =>
        m.id === action.payload.id ? action.payload : m
      );

      return {
        ...state,
        members: updatedMembers,
        membersById: updatedMembersById
      };
    }

    case 'ADD_MEMBER_ROLLBACK': {
      const { [action.payload]: removed, ...remainingMembers } = state.membersById;

      return {
        ...state,
        members: state.members.filter(m => m.id !== action.payload),
        membersById: remainingMembers,
        totalMembers: Math.max(0, state.totalMembers - 1)
      };
    }

    case 'UPDATE_MEMBER_ROLE_OPTIMISTIC': {
      const member = state.membersById[action.payload.userId];
      if (!member) return state;

      const updatedMember = { ...member, role: action.payload.role };
      const updatedMembersById = {
        ...state.membersById,
        [action.payload.userId]: updatedMember
      };

      return {
        ...state,
        members: state.members.map(m =>
          m.id === action.payload.userId ? updatedMember : m
        ),
        membersById: updatedMembersById
      };
    }

    case 'UPDATE_MEMBER_ROLE_SUCCESS':
      // Optimistic update already applied, no need to change
      return state;

    case 'UPDATE_MEMBER_ROLE_ROLLBACK': {
      const member = state.membersById[action.payload.userId];
      if (!member) return state;

      const rolledBackMember = { ...member, role: action.payload.oldRole };
      const updatedMembersById = {
        ...state.membersById,
        [action.payload.userId]: rolledBackMember
      };

      return {
        ...state,
        members: state.members.map(m =>
          m.id === action.payload.userId ? rolledBackMember : m
        ),
        membersById: updatedMembersById
      };
    }

    case 'UPDATE_MEMBER_STATUS_OPTIMISTIC': {
      const member = state.membersById[action.payload.userId];
      if (!member) return state;

      const updatedMember = { ...member, status: action.payload.status };
      const updatedMembersById = {
        ...state.membersById,
        [action.payload.userId]: updatedMember
      };

      return {
        ...state,
        members: state.members.map(m =>
          m.id === action.payload.userId ? updatedMember : m
        ),
        membersById: updatedMembersById
      };
    }

    case 'UPDATE_MEMBER_STATUS_SUCCESS':
      // Optimistic update already applied
      return state;

    case 'UPDATE_MEMBER_STATUS_ROLLBACK': {
      const member = state.membersById[action.payload.userId];
      if (!member) return state;

      const rolledBackMember = { ...member, status: action.payload.oldStatus };
      const updatedMembersById = {
        ...state.membersById,
        [action.payload.userId]: rolledBackMember
      };

      return {
        ...state,
        members: state.members.map(m =>
          m.id === action.payload.userId ? rolledBackMember : m
        ),
        membersById: updatedMembersById
      };
    }

    case 'REMOVE_MEMBER_OPTIMISTIC': {
      const { [action.payload]: removed, ...remainingMembers } = state.membersById;

      return {
        ...state,
        members: state.members.filter(m => m.id !== action.payload),
        membersById: remainingMembers,
        totalMembers: Math.max(0, state.totalMembers - 1)
      };
    }

    case 'REMOVE_MEMBER_SUCCESS':
      // Optimistic update already applied
      return state;

    case 'REMOVE_MEMBER_ROLLBACK': {
      const restoredMembersById = {
        ...state.membersById,
        [action.payload.id]: action.payload
      };

      return {
        ...state,
        members: [...state.members, action.payload],
        membersById: restoredMembersById,
        totalMembers: state.totalMembers + 1
      };
    }

    case 'UPDATE_MEMBER_REALTIME': {
      const updatedMembersById = {
        ...state.membersById,
        [action.payload.id]: action.payload
      };

      const memberExists = state.membersById[action.payload.id];
      const updatedMembers = memberExists
        ? state.members.map(m => m.id === action.payload.id ? action.payload : m)
        : [...state.members, action.payload];

      return {
        ...state,
        members: updatedMembers,
        membersById: updatedMembersById,
        totalMembers: memberExists ? state.totalMembers : state.totalMembers + 1
      };
    }

    case 'REMOVE_MEMBER_REALTIME': {
      const { [action.payload]: removed, ...remainingMembers } = state.membersById;

      return {
        ...state,
        members: state.members.filter(m => m.id !== action.payload),
        membersById: remainingMembers,
        totalMembers: Math.max(0, state.totalMembers - 1)
      };
    }

    case 'START_OPERATION': {
      const newPendingOps = new Set(state.pendingOperations);
      newPendingOps.add(action.payload);
      return {
        ...state,
        pendingOperations: newPendingOps
      };
    }

    case 'END_OPERATION': {
      const newPendingOps = new Set(state.pendingOperations);
      newPendingOps.delete(action.payload);
      return {
        ...state,
        pendingOperations: newPendingOps
      };
    }

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

const TeamContext = createContext<TeamContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function TeamProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(teamReducer, initialState);

  // ============================================================================
  // REAL-TIME UPDATES
  // ============================================================================

  useEffect(() => {
    // Subscribe to team-related socket events
    const handleTeamMemberUpdated = (data: TeamMemberSummary) => {
      console.log('🔄 Team member updated (real-time):', data.id);
      dispatch({ type: 'UPDATE_MEMBER_REALTIME', payload: data });
    };

    const handleTeamMemberRemoved = (data: { userId: string }) => {
      console.log('🗑️ Team member removed (real-time):', data.userId);
      dispatch({ type: 'REMOVE_MEMBER_REALTIME', payload: data.userId });
    };

    const handleTeamMemberInvited = (data: TeamMemberSummary) => {
      console.log('📧 Team member invited (real-time):', data.id);
      dispatch({ type: 'UPDATE_MEMBER_REALTIME', payload: data });
    };

    // Register socket listeners
    socketService.on('team-member-updated', handleTeamMemberUpdated);
    socketService.on('team-member-removed', handleTeamMemberRemoved);
    socketService.on('team-member-invited', handleTeamMemberInvited);

    // Cleanup
    return () => {
      socketService.off('team-member-updated', handleTeamMemberUpdated);
      socketService.off('team-member-removed', handleTeamMemberRemoved);
      socketService.off('team-member-invited', handleTeamMemberInvited);
    };
  }, []);

  // ============================================================================
  // FETCH DATA
  // ============================================================================

  const fetchTeamMembers = useCallback(async () => {
    dispatch({ type: 'FETCH_MEMBERS_START' });

    try {
      console.log('📋 Fetching team members...');
      const response = await teamService.getTeamMembers();

      dispatch({
        type: 'FETCH_MEMBERS_SUCCESS',
        payload: {
          members: response.data.teamMembers,
          total: response.data.total
        }
      });

      console.log(`✅ Fetched ${response.data.total} team members`);
    } catch (error: any) {
      console.error('❌ Error fetching team members:', error);
      dispatch({
        type: 'FETCH_MEMBERS_ERROR',
        payload: error.message || 'Failed to fetch team members'
      });
    }
  }, []);

  const fetchCurrentUserPermissions = useCallback(async () => {
    dispatch({ type: 'FETCH_PERMISSIONS_START' });

    try {
      console.log('🔐 Fetching current user permissions...');
      const userTeam = await teamService.getCurrentUserPermissions();

      dispatch({
        type: 'FETCH_PERMISSIONS_SUCCESS',
        payload: userTeam
      });

      console.log(`✅ User role: ${userTeam.role}, Permissions: ${userTeam.permissions.length}`);
    } catch (error: any) {
      console.error('❌ Error fetching permissions:', error);
      dispatch({
        type: 'FETCH_PERMISSIONS_ERROR',
        payload: error.message || 'Failed to fetch permissions'
      });
    }
  }, []);

  // ============================================================================
  // TEAM MEMBER OPERATIONS
  // ============================================================================

  const inviteMember = useCallback(async (data: InviteTeamMemberRequest) => {
    const operationId = `invite-${Date.now()}`;
    dispatch({ type: 'START_OPERATION', payload: operationId });

    // Create optimistic member
    const optimisticMember: TeamMemberSummary = {
      id: `temp-${Date.now()}`,
      name: data.name,
      email: data.email,
      role: data.role,
      status: 'inactive',
      invitedAt: new Date().toISOString()
    };

    dispatch({ type: 'ADD_MEMBER_OPTIMISTIC', payload: optimisticMember });

    try {
      console.log('📧 Inviting team member:', data.email);
      const response = await teamService.inviteTeamMember(data);

      // We don't get the full member data in response, so we'll refetch
      await fetchTeamMembers();

      console.log('✅ Team member invited successfully');
    } catch (error: any) {
      console.error('❌ Error inviting team member:', error);

      // Rollback optimistic update
      dispatch({ type: 'ADD_MEMBER_ROLLBACK', payload: optimisticMember.id });

      throw error;
    } finally {
      dispatch({ type: 'END_OPERATION', payload: operationId });
    }
  }, [fetchTeamMembers]);

  const updateMemberRole = useCallback(async (
    userId: string,
    role: Exclude<MerchantRole, 'owner'>
  ) => {
    const operationId = `update-role-${userId}`;
    dispatch({ type: 'START_OPERATION', payload: operationId });

    const oldRole = state.membersById[userId]?.role;
    if (!oldRole) {
      throw new Error('Member not found');
    }

    // Optimistic update
    dispatch({
      type: 'UPDATE_MEMBER_ROLE_OPTIMISTIC',
      payload: { userId, role }
    });

    try {
      console.log(`🔄 Updating role for user ${userId} to ${role}`);
      const response = await teamService.updateTeamMemberRole(userId, { role });

      dispatch({
        type: 'UPDATE_MEMBER_ROLE_SUCCESS',
        payload: {
          userId,
          role: response.data.teamMember.role,
          permissions: response.data.teamMember.permissions
        }
      });

      console.log('✅ Role updated successfully');
    } catch (error: any) {
      console.error('❌ Error updating role:', error);

      // Rollback
      dispatch({
        type: 'UPDATE_MEMBER_ROLE_ROLLBACK',
        payload: { userId, oldRole }
      });

      throw error;
    } finally {
      dispatch({ type: 'END_OPERATION', payload: operationId });
    }
  }, [state.membersById]);

  const updateMemberStatus = useCallback(async (
    userId: string,
    status: TeamMemberStatus
  ) => {
    const operationId = `update-status-${userId}`;
    dispatch({ type: 'START_OPERATION', payload: operationId });

    const oldStatus = state.membersById[userId]?.status;
    if (!oldStatus) {
      throw new Error('Member not found');
    }

    // Optimistic update
    dispatch({
      type: 'UPDATE_MEMBER_STATUS_OPTIMISTIC',
      payload: { userId, status }
    });

    try {
      console.log(`🔄 Updating status for user ${userId} to ${status}`);
      await teamService.updateTeamMemberStatus(userId, { status });

      dispatch({
        type: 'UPDATE_MEMBER_STATUS_SUCCESS',
        payload: { userId, status }
      });

      console.log('✅ Status updated successfully');
    } catch (error: any) {
      console.error('❌ Error updating status:', error);

      // Rollback
      dispatch({
        type: 'UPDATE_MEMBER_STATUS_ROLLBACK',
        payload: { userId, oldStatus }
      });

      throw error;
    } finally {
      dispatch({ type: 'END_OPERATION', payload: operationId });
    }
  }, [state.membersById]);

  const removeMember = useCallback(async (userId: string) => {
    const operationId = `remove-${userId}`;
    dispatch({ type: 'START_OPERATION', payload: operationId });

    const member = state.membersById[userId];
    if (!member) {
      throw new Error('Member not found');
    }

    // Optimistic removal
    dispatch({ type: 'REMOVE_MEMBER_OPTIMISTIC', payload: userId });

    try {
      console.log(`🗑️ Removing team member: ${userId}`);
      await teamService.removeTeamMember(userId);

      dispatch({ type: 'REMOVE_MEMBER_SUCCESS', payload: userId });

      console.log('✅ Team member removed successfully');
    } catch (error: any) {
      console.error('❌ Error removing team member:', error);

      // Rollback
      dispatch({ type: 'REMOVE_MEMBER_ROLLBACK', payload: member });

      throw error;
    } finally {
      dispatch({ type: 'END_OPERATION', payload: operationId });
    }
  }, [state.membersById]);

  const suspendMember = useCallback(async (userId: string) => {
    await updateMemberStatus(userId, 'suspended');
  }, [updateMemberStatus]);

  const activateMember = useCallback(async (userId: string) => {
    await updateMemberStatus(userId, 'active');
  }, [updateMemberStatus]);

  const resendInvitation = useCallback(async (userId: string) => {
    try {
      console.log(`📧 Resending invitation to user: ${userId}`);
      await teamService.resendInvitation(userId);
      console.log('✅ Invitation resent successfully');
    } catch (error: any) {
      console.error('❌ Error resending invitation:', error);
      throw error;
    }
  }, []);

  // ============================================================================
  // PERMISSION CHECKING
  // ============================================================================

  const hasPermission = useCallback((permission: Permission): boolean => {
    return state.currentUserPermissions.includes(permission);
  }, [state.currentUserPermissions]);

  const hasAnyPermission = useCallback((permissions: Permission[]): boolean => {
    return permissions.some(p => state.currentUserPermissions.includes(p));
  }, [state.currentUserPermissions]);

  const hasAllPermissions = useCallback((permissions: Permission[]): boolean => {
    return permissions.every(p => state.currentUserPermissions.includes(p));
  }, [state.currentUserPermissions]);

  const canEditMember = useCallback((targetRole: MerchantRole): boolean => {
    if (!state.currentUserRole) return false;
    return teamService.canEditTeamMember(state.currentUserRole, targetRole);
  }, [state.currentUserRole]);

  // ============================================================================
  // UTILITIES
  // ============================================================================

  const getMember = useCallback((userId: string) => {
    return state.membersById[userId];
  }, [state.membersById]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const refreshTeam = useCallback(async () => {
    await Promise.all([
      fetchTeamMembers(),
      fetchCurrentUserPermissions()
    ]);
  }, [fetchTeamMembers, fetchCurrentUserPermissions]);

  // ============================================================================
  // INITIAL LOAD
  // ============================================================================

  useEffect(() => {
    refreshTeam();
  }, []);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value: TeamContextType = {
    state,
    members: state.members,
    totalMembers: state.totalMembers,
    currentUserRole: state.currentUserRole,
    currentUserPermissions: state.currentUserPermissions,
    isLoadingMembers: state.isLoadingMembers,
    isLoadingPermissions: state.isLoadingPermissions,
    fetchTeamMembers,
    fetchCurrentUserPermissions,
    inviteMember,
    updateMemberRole,
    updateMemberStatus,
    removeMember,
    suspendMember,
    activateMember,
    resendInvitation,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canEditMember,
    getMember,
    clearError,
    refreshTeam
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useTeamContext() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeamContext must be used within a TeamProvider');
  }
  return context;
}
