import React from 'react';
import { CheckCircle, Clock, DollarSign, MessageSquare, Tag, TrendingUp, User, Trophy, Sparkles, XCircle, Building2, FileText, Link2, Phone, Handshake, CalendarClock, Send } from 'lucide-react';
import type { LeadTimelineEvent } from '../types';
export function getTimelineIcon(type: LeadTimelineEvent['type']): React.ReactNode {
    switch (type) {
        case 'created': return <CheckCircle size={16} className="text-green-600" />;
        case 'stage_change': return <TrendingUp size={16} className="text-blue-600" />;
        case 'status_change': return <Tag size={16} className="text-purple-600" />;
        case 'contact_attempt': return <Phone size={16} className="text-sky-600" />;
        case 'comment': return <MessageSquare size={16} className="text-gray-600" />;
        case 'value_change': return <DollarSign size={16} className="text-emerald-600" />;
        case 'owner_assigned': return <User size={16} className="text-indigo-600" />;
        case 'conversion': return <Trophy size={16} className="text-amber-600" />;
        case 'converted_from_prospect': return <Sparkles size={16} className="text-cyan-600" />;
        case 'loss': return <XCircle size={16} className="text-red-500" />;
        case 'client_record_synced': return <Building2 size={16} className="text-emerald-600" />;
        case 'commercial_origin_updated': return <Link2 size={16} className="text-violet-600" />;
        case 'proposal_created': return <FileText size={16} className="text-blue-700" />;
        case 'proposal_sent': return <Send size={16} className="text-sky-700" />;
        case 'proposal_accepted': return <CheckCircle size={16} className="text-emerald-700" />;
        case 'proposal_rejected': return <XCircle size={16} className="text-rose-600" />;
        case 'department_handoff': return <Handshake size={16} className="text-indigo-700" />;
        case 'department_task_status_changed': return <Clock size={16} className="text-amber-700" />;
        case 'department_task_completed': return <CheckCircle size={16} className="text-emerald-700" />;
        case 'appointment_scheduled': return <CalendarClock size={16} className="text-cyan-700" />;
        case 'appointment_updated': return <CalendarClock size={16} className="text-blue-600" />;
        case 'appointment_status_changed': return <CalendarClock size={16} className="text-amber-700" />;
        case 'appointment_removed': return <XCircle size={16} className="text-gray-500" />;
        default: return <Clock size={16} className="text-gray-400" />;
    }
}
