import { HelpTooltip } from '@renderer/components/TooltipIcons'
import { useAgents } from '@renderer/hooks/agents/useAgents'
import type { AgentBaseWithId, UpdateAgentFunctionUnion } from '@renderer/types'
import { Select } from 'antd'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { SettingsItem, SettingsTitle } from '../shared'

export interface SubAgentsSettingProps {
  base: AgentBaseWithId | undefined | null
  update: UpdateAgentFunctionUnion
}

export const SubAgentsSetting = ({ base, update }: SubAgentsSettingProps) => {
  const { t } = useTranslation()
  const { agents } = useAgents()

  // Get available agents for sub-agent selection (exclude current agent)
  const availableSubAgents = useMemo(() => {
    if (!base) return []
    return agents.filter((a) => a.id !== base.id).map((a) => ({ label: a.name, value: a.id }))
  }, [agents, base])

  const handleSubAgentChange = (subAgentIds: string[]) => {
    if (!base) return
    update({ id: base.id, sub_agent_id_list: subAgentIds })
  }

  if (!base) return null

  const selectedSubAgents = base.sub_agent_id_list || []

  return (
    <SettingsItem inline={false}>
      <SettingsTitle
        id="sub-agents"
        contentAfter={
          <HelpTooltip
            title={t('agent.settings.subAgents.tooltip', 'Select agents that can be delegated tasks by this agent.')}
          />
        }>
        {t('agent.settings.subAgents.title', 'Sub Agents')}
      </SettingsTitle>
      <Select
        mode="multiple"
        value={selectedSubAgents}
        onChange={handleSubAgentChange}
        options={availableSubAgents}
        placeholder={t('agent.multiagent.subAgents.placeholder', 'Select sub agents')}
        style={{ width: '100%' }}
        allowClear
      />
      {selectedSubAgents.length > 0 && (
        <div className="mt-2 text-[var(--color-text-3)] text-xs">
          {t('agent.multiagent.subAgents.selected', {
            count: selectedSubAgents.length,
            defaultValue: '{{count}} sub-agent(s) selected'
          })}
        </div>
      )}
    </SettingsItem>
  )
}

export default SubAgentsSetting
