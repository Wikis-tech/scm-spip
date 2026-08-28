import fs from 'node:fs';

function patch(path, transform) {
  const before = fs.readFileSync(path, 'utf8');
  const after = transform(before);
  if (after !== before) fs.writeFileSync(path, after);
}

patch('src/server/phase3Routes.ts', (s) => {
  if (!s.includes('function mapProspectRow(')) {
    const marker = `function canManageProspect(user: any, prospect: any): boolean {\n  if (!user?.userId) return false;\n  if (user.isAdmin) return true;\n  return String(prospect?.assigned_officer_id || '') === String(user.userId);\n}\n`;
    const mapper = `${marker}\nfunction mapProspectRow(row: any) {\n  if (!row) return row;\n  return {\n    id: row.id, name: row.name, industry: row.industry, orgType: row.org_type, location: row.location,\n    website: row.website, phone: row.phone, email: row.email, source: row.source,\n    assignedOfficerId: row.assigned_officer_id, assignedOfficerName: row.assigned_officer_name,\n    status: row.status, priority: row.priority, notes: row.notes,\n    conversionProbability: Number(row.conversion_probability || 0),\n    opportunityValue: Number(row.opportunity_value || 0),\n    treasuryPotential: row.treasury_potential, mmfPotential: row.mmf_potential, wealthPotential: row.wealth_potential,\n    literacyPotential: row.literacy_potential, opportunityScore: Number(row.opportunity_score || 0),\n    primaryContactId: row.primary_contact_id, stageEnteredDate: row.stage_entered_date, stageUpdatedDate: row.stage_updated_date,\n    actualRevenue: Number(row.actual_revenue || 0), lastActivityDate: row.last_activity_date, nextAction: row.next_action,\n    productInterests: row.product_interests || [], campaignId: row.campaign_id, convertedAt: row.converted_at,\n    convertedProduct: row.converted_product, initialInvestment: Number(row.initial_investment || 0),\n    currentAum: Number(row.current_aum || 0), relationshipHealth: row.relationship_health,\n    apolloOrganizationId: row.apollo_organization_id, websiteDomain: row.website_domain,\n    createdAt: row.created_at, updatedAt: row.updated_at,\n  };\n}\n`;
    if (!s.includes(marker)) throw new Error('phase3Routes mapper marker missing');
    s = s.replace(marker, mapper);
  }

  s = s.replace(`return res.json(data || []);\n  });\n\n  app.post('/api/crm/prospects/check-duplicate'`, `return res.json((data || []).map(mapProspectRow));\n  });\n\n  app.post('/api/crm/prospects/check-duplicate'`);
  s = s.replace(`      return res.status(201).json(data);\n    } catch (error: any) {\n      console.error('[PHASE 3] Prospect creation failed:'`, `      return res.status(201).json(mapProspectRow(data));\n    } catch (error: any) {\n      console.error('[PHASE 3] Prospect creation failed:'`);
  s = s.replace(`    return res.json(data);\n  });\n\n  app.post('/api/crm/prospects/:id/convert'`, `    return res.json(mapProspectRow(data));\n  });\n\n  app.post('/api/crm/prospects/:id/convert'`);
  s = s.replace(`return res.status(201).json({ prospect: data, conversion });`, `return res.status(201).json({ prospect: mapProspectRow(data), conversion });`);
  return s;
});

patch('src/server/phase3CrudRoutes.ts', (s) => {
  if (!s.includes('const mapContactRow')) {
    const marker = `function id(prefix: string) { return \`${'${prefix}'}-${'${crypto.randomUUID()}'}\`; }\nfunction now() { return new Date().toISOString(); }\n`;
    const mappers = `${marker}\nconst mapContactRow = (r:any) => ({ id:r.id, prospectId:r.prospect_id, prospectName:r.prospect_name, fullName:r.full_name, position:r.position, department:r.department, email:r.email, phone:r.phone, linkedin:r.linkedin, influenceLevel:r.influence_level, isDecisionMaker:Boolean(r.is_decision_maker), notes:r.notes, validationLevel:r.validation_level, createdAt:r.created_at });\nconst mapActivityRow = (r:any) => ({ id:r.id, prospectId:r.prospect_id, prospectName:r.prospect_name, date:r.date, time:r.time, officerId:r.officer_id, officerName:r.officer_name, activityType:r.activity_type, outcome:r.outcome, notes:r.notes, status:r.status, createdAt:r.created_at });\nconst mapMeetingRow = (r:any) => ({ id:r.id, prospectId:r.prospect_id, prospectName:r.prospect_name, officerId:r.officer_id, officerName:r.officer_name, date:r.date, time:r.time, durationMinutes:Number(r.duration_minutes||45), purpose:r.purpose, outcome:r.outcome, nextAction:r.next_action, createdAt:r.created_at });\nconst mapTaskRow = (r:any) => ({ id:r.id, prospectId:r.prospect_id, prospectName:r.prospect_name, title:r.title, dueDate:r.due_date, assignedStaff:r.assigned_staff, officerId:r.officer_id, priority:r.priority, isCompleted:Boolean(r.is_completed), notes:r.notes, status:r.is_completed ? 'Completed' : 'Pending' });\n`;
    if (!s.includes(marker)) throw new Error('phase3Crud mapper marker missing');
    s = s.replace(marker, mappers);
  }

  // Contact GET and mutations.
  s = s.replace(`return res.json(data || []);\n    } catch (e:any)`, `return res.json((data || []).map(mapContactRow));\n    } catch (e:any)`);
  s = s.replace(`if (error) return res.status(500).json({ error: 'Unable to add contact.' }); return res.status(201).json(data);`, `if (error) return res.status(500).json({ error: 'Unable to add contact.' }); return res.status(201).json(mapContactRow(data));`);
  s = s.replace(`if (error) return res.status(500).json({ error: 'Unable to update contact.' }); return res.json(data);`, `if (error) return res.status(500).json({ error: 'Unable to update contact.' }); return res.json(mapContactRow(data));`);

  // Activities.
  s = s.replace(`return res.json(data || []);\n  });\n  app.post('/api/crm/activities'`, `return res.json((data || []).map(mapActivityRow));\n  });\n  app.post('/api/crm/activities'`);
  s = s.replace(`if(error)return res.status(500).json({error:'Unable to log activity.'}); return res.status(201).json(data);`, `if(error)return res.status(500).json({error:'Unable to log activity.'}); return res.status(201).json(mapActivityRow(data));`);
  s = s.replace(`if(error)return res.status(500).json({error:'Unable to update activity.'}); return res.json(data);`, `if(error)return res.status(500).json({error:'Unable to update activity.'}); return res.json(mapActivityRow(data));`);

  // Meetings.
  s = s.replace(`return res.json(data||[]); });\n  app.post('/api/crm/meetings'`, `return res.json((data||[]).map(mapMeetingRow)); });\n  app.post('/api/crm/meetings'`);
  s = s.replace(`if(error)return res.status(500).json({error:'Unable to schedule meeting.'}); return res.status(201).json(data);`, `if(error)return res.status(500).json({error:'Unable to schedule meeting.'}); return res.status(201).json(mapMeetingRow(data));`);
  s = s.replace(`if(error)return res.status(500).json({error:'Unable to update meeting.'}); return res.json(data);`, `if(error)return res.status(500).json({error:'Unable to update meeting.'}); return res.json(mapMeetingRow(data));`);

  // Tasks.
  s = s.replace(`return res.json(data||[]); });\n  app.post('/api/crm/tasks'`, `return res.json((data||[]).map(mapTaskRow)); });\n  app.post('/api/crm/tasks'`);
  s = s.replace(`if(error)return res.status(500).json({error:'Unable to create task.'}); return res.status(201).json(data);`, `if(error)return res.status(500).json({error:'Unable to create task.'}); return res.status(201).json(mapTaskRow(data));`);
  s = s.replace(`if(error)return res.status(500).json({error:'Unable to update task.'}); return res.json(data);`, `if(error)return res.status(500).json({error:'Unable to update task.'}); return res.json(mapTaskRow(data));`);
  return s;
});

// Make administration failures visible instead of silently rendering a zero-user directory.
patch('src/pages/AdminDashboard.tsx', (s) => {
  if (!s.includes('Unable to load the SCM user directory.')) {
    s = s.replace(`      if (uRes.ok) {\n        const uData = await uRes.json();\n        setUsersList(uData);\n      }`, `      if (uRes.ok) {\n        const uData = await uRes.json();\n        setUsersList(Array.isArray(uData) ? uData : []);\n      } else {\n        const payload = await uRes.json().catch(() => ({}));\n        showToast(payload.error || 'Unable to load the SCM user directory.', 'error');\n      }`);
  }
  return s;
});

console.log('Phase 3 compatibility contract fixes applied.');
