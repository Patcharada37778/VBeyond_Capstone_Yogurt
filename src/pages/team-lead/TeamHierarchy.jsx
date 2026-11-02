import { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { PageHeader } from '../../components/common';
import { AgentProfileModal, OrgChart } from '../../components/dashboard/AgentShared';

export default function TeamHierarchy() {
  const { state, user } = useStore();
  const [scope, setScope] = useState('mine');
  const [selected, setSelected] = useState(null);
  const team = user.ledTeam;
  const sensitive = (a) => a?.teamId === team?.id;
  return (
    <>
      <PageHeader title="Team Hierarchy" subtitle="See how teams and team leads are organised." crumbs={[{ label: 'My Team' }, { label: 'Hierarchy' }]}
        actions={<div className="btn-group" role="group" aria-label="Scope">
          <button className={`btn ${scope === 'mine' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setScope('mine')}>My team</button>
          <button className={`btn ${scope === 'all' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setScope('all')}>All teams</button>
        </div>} />
      <div className="card"><div className="card-body">
        <OrgChart teams={state.teams} agents={state.agents} onlyTeamId={scope === 'mine' ? team?.id : null} onSelect={setSelected} />
      </div></div>
      <AgentProfileModal agent={selected} teams={state.teams} agents={state.agents} onClose={() => setSelected(null)} showSensitive={sensitive(selected)} />
    </>
  );
}
