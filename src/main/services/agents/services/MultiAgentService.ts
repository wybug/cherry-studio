/**
 * MultiAgentService - Service for managing sub-agents
 *
 * Provides functionality to:
 * - Get sub-agent entities by IDs
 * - Build SDK AgentDefinition from sub-agent configurations
 * - Validate sub-agent lists
 */

import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk'
import { loggerService } from '@logger'
import type { AgentEntity } from '@types'
import { inArray } from 'drizzle-orm'

import { BaseService } from '../BaseService'
import { agentsTable } from '../database/schema'

const logger = loggerService.withContext('MultiAgentService')

/**
 * Map full model ID to SDK short model name
 */
function mapModelToSDK(modelId: string): 'sonnet' | 'opus' | 'haiku' | 'inherit' {
  if (modelId.includes('sonnet')) return 'sonnet'
  if (modelId.includes('opus')) return 'opus'
  if (modelId.includes('haiku')) return 'haiku'
  return 'inherit' // Default to inheriting main agent model
}

/**
 * Parse sub_agent_id_list from database text field
 */
function parseSubAgentIds(subAgentIdList: string | null | undefined): string[] {
  if (!subAgentIdList) return []
  // The database stores as pipe-separated string: "agent_1|agent_2|agent_3"
  return subAgentIdList.split('|').filter(Boolean)
}

export class MultiAgentService extends BaseService {
  private static instance: MultiAgentService | null = null

  static getInstance(): MultiAgentService {
    if (!MultiAgentService.instance) {
      MultiAgentService.instance = new MultiAgentService()
    }
    return MultiAgentService.instance
  }

  /**
   * Get sub-agent entities by their IDs
   */
  async getSubAgents(subAgentIds: string[]): Promise<AgentEntity[]> {
    if (!subAgentIds || subAgentIds.length === 0) {
      return []
    }

    const database = await this.getDatabase()
    const result = await database.select().from(agentsTable).where(inArray(agentsTable.id, subAgentIds))

    return result.map((row) => this.deserializeJsonFields(row)) as AgentEntity[]
  }

  /**
   * Validate that all sub-agent IDs exist
   * Returns true if all IDs are valid, false otherwise
   */
  async validateSubAgents(subAgentIds: string[]): Promise<boolean> {
    if (!subAgentIds || subAgentIds.length === 0) {
      return true
    }

    const agents = await this.getSubAgents(subAgentIds)
    return agents.length === subAgentIds.length
  }

  /**
   * Build SDK AgentDefinition map from sub-agent IDs
   *
   * This converts agent configurations from the database into the format
   * expected by the Claude Agent SDK's agents parameter.
   */
  async buildSubAgentDefinitions(mainAgentId: string, subAgentIds: string[]): Promise<Record<string, AgentDefinition>> {
    if (!subAgentIds || subAgentIds.length === 0) {
      return {}
    }

    const subAgents = await this.getSubAgents(subAgentIds)

    // Filter out the main agent itself if somehow included
    const validSubAgents = subAgents.filter((agent) => agent.id !== mainAgentId)

    const agentDefinitions: Record<string, AgentDefinition> = {}

    for (const agent of validSubAgents) {
      const subAgentId = agent.id

      // Build the agent definition for SDK
      agentDefinitions[subAgentId] = {
        description: agent.description || `Sub-agent: ${agent.name}`,
        prompt: agent.instructions || `You are ${agent.name}.`,
        tools: agent.allowed_tools,
        model: mapModelToSDK(agent.model)
      }

      logger.debug('Built sub-agent definition', {
        subAgentId,
        subAgentName: agent.name,
        model: agentDefinitions[subAgentId].model
      })
    }

    return agentDefinitions
  }

  /**
   * Get sub-agent ID list from agent entity
   */
  getSubAgentIdsFromEntity(agent: AgentEntity): string[] {
    return parseSubAgentIds(agent.sub_agent_id_list as unknown as string | undefined)
  }
}

export const multiAgentService = MultiAgentService.getInstance()
