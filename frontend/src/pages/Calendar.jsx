import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Plus, Calendar as CalendarIcon, Clock, X } from 'lucide-react';

export default function Calendar() {
    const [events, setEvents] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [form, setForm] = useState({ title: '', time: '', note: '' });
    const [selectedDate, setSelectedDate] = useState('');
    const [stats, setStats] = useState({ total: 0, thisWeek: 0, upcoming: 0 });

    const fetchEvents = async () => {
        setEvents([]);
        setStats({ total: 0, thisWeek: 0, upcoming: 0 });
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const parseTime = (timeStr) => {
        if (!timeStr) return '09:00';
        const str = timeStr.toLowerCase().trim().replace(/\s+/g, '');
        if (/^\d{1,2}:\d{2}$/.test(str)) return str;

        const match = str.match(/^(\d{1,2})(?::(\d{2}))?(am|pm|a\.m\.|p\.m\.)$/);
        if (match) {
            let hour = parseInt(match[1]);
            const minute = match[2] || '00';
            const period = match[3];
            if (period.startsWith('p') && hour !== 12) hour += 12;
            if (period.startsWith('a') && hour === 12) hour = 0;
            return `${hour.toString().padStart(2, '0')}:${minute}`;
        }
        if (/^\d{1,2}$/.test(str)) return `${str.padStart(2, '0')}:00`;
        return '09:00';
    };

    const openQuickAdd = (info) => {
        setEditingEvent(null);
        setSelectedDate(info.dateStr);
        setForm({ title: '', time: '9am', note: '' });
        setShowModal(true);
    };

    const handleEventClick = (info) => {
        const event = events.find(e => e.id === parseInt(info.event.id));
        if (!event) return;

        const date = event.start.split('T')[0];
        const time = event.start.split('T')[1]?.slice(0, 5) || '09:00';

        setEditingEvent(event);
        setSelectedDate(date);
        setForm({
            title: event.title,
            time: time,
            note: event.description || ''
        });
        setShowModal(true);
    };

    const saveEvent = async () => {
        if (!form.title.trim()) {
            alert('Please enter an event name');
            return;
        }

        const time24 = parseTime(form.time);
        const startDateTime = `${selectedDate}T${time24}:00`;

        const newEvent = {
            id: Date.now(),
            title: form.title.trim(),
            start: startDateTime,
            description: form.note.trim()
        };

        if (editingEvent) {
            setEvents(events.map(e => e.id === editingEvent.id ? { ...newEvent, id: editingEvent.id } : e));
        } else {
            setEvents([...events, newEvent]);
        }

        setShowModal(false);
    };

    const deleteEvent = () => {
        if (!editingEvent || !confirm('Delete this event?')) return;
        setEvents(events.filter(e => e.id !== editingEvent.id));
        setShowModal(false);
    };

    return (
        <div className="p-8">
            <div className="max-w-[1200px]">
                {/* Header */}
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-semibold tracking-tighter">Calendar</h1>
                        <p className="text-gray-400 mt-1">Schedule jobs, meetings, and reminders</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                            <CalendarIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-3xl font-semibold tracking-tighter">{stats.total}</div>
                            <div className="text-sm text-gray-400 -mt-1">Total Events</div>
                        </div>
                    </div>
                    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                            <Clock className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <div className="text-3xl font-semibold tracking-tighter text-blue-400">{stats.thisWeek}</div>
                            <div className="text-sm text-gray-400 -mt-1">This Week</div>
                        </div>
                    </div>
                    <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                            <Clock className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <div className="text-3xl font-semibold tracking-tighter text-emerald-400">{stats.upcoming}</div>
                            <div className="text-sm text-gray-400 -mt-1">Upcoming</div>
                        </div>
                    </div>
                </div>

                {/* Calendar */}
                <div className="mb-3 flex items-center justify-between px-1">
                    <div className="text-lg font-semibold">Schedule</div>
                    <div className="text-xs text-gray-500">Click a day to add • Click event to edit</div>
                </div>

                <div className="bg-zinc-900 border border-white/10 rounded-3xl p-4">
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek'
                        }}
                        events={events.map(e => ({
                            id: e.id,
                            title: e.title,
                            start: e.start,
                            allDay: false,
                            backgroundColor: '#3b82f6',
                            borderColor: '#3b82f6',
                            textColor: '#ffffff',
                            extendedProps: {
                                description: e.description
                            }
                        }))}
                        dateClick={openQuickAdd}
                        eventClick={handleEventClick}
                        height="auto"
                        dayMaxEvents={4}
                    />
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
                    <div className="bg-zinc-900 border border-white/10 w-full max-w-md rounded-3xl overflow-hidden relative">

                        {/* Close Button */}
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="px-8 pt-8 pb-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-9 h-9 bg-white rounded-2xl flex items-center justify-center">
                                    <Plus className="w-5 h-5 text-black" />
                                </div>
                                <div>
                                    <div className="font-semibold text-xl tracking-tight">
                                        {editingEvent ? 'Edit Event' : 'Add Event'}
                                    </div>
                                    <div className="text-xs text-gray-500 -mt-0.5">
                                        {new Date(selectedDate).toLocaleDateString('en-US', {
                                            weekday: 'long', month: 'long', day: 'numeric'
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-5">
                                {/* Event Name */}
                                <div>
                                    <div className="text-xs text-gray-400 tracking-widest mb-2">EVENT NAME</div>
                                    <input
                                        type="text"
                                        value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        className="w-full bg-black border border-white/10 focus:border-white/30 rounded-2xl px-5 py-4 text-lg text-white placeholder:text-gray-500"
                                        placeholder="Job at Riverside Property"
                                        autoFocus
                                    />
                                </div>

                                {/* Time */}
                                <div>
                                    <div className="text-xs text-gray-400 tracking-widest mb-2">TIME</div>
                                    <input
                                        type="text"
                                        value={form.time}
                                        onChange={(e) => setForm({ ...form, time: e.target.value })}
                                        className="w-full bg-black border border-white/10 focus:border-white/30 rounded-2xl px-5 py-4 text-lg text-white placeholder:text-gray-500"
                                        placeholder="9am or 2:30pm"
                                    />
                                </div>

                                {/* Notes */}
                                <div>
                                    <div className="text-xs text-gray-400 tracking-widest mb-2">NOTES (OPTIONAL)</div>
                                    <textarea
                                        value={form.note}
                                        onChange={(e) => setForm({ ...form, note: e.target.value })}
                                        className="w-full bg-black border border-white/10 focus:border-white/30 rounded-2xl px-5 py-3 h-20 resize-none text-sm text-white placeholder:text-gray-500"
                                        placeholder="Bring extra mulch..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-black/40 px-8 py-5 flex gap-3 border-t border-white/10">
                            {editingEvent && (
                                <button onClick={deleteEvent} className="flex-1 py-3.5 text-sm font-semibold text-red-400 hover:bg-red-500/10 rounded-2xl transition">
                                    Delete
                                </button>
                            )}
                            <button onClick={() => setShowModal(false)} className="flex-1 py-3.5 text-sm font-semibold bg-white/5 hover:bg-white/10 rounded-2xl transition">
                                Cancel
                            </button>
                            <button onClick={saveEvent} className="flex-1 py-3.5 text-sm font-semibold bg-white text-black rounded-2xl hover:bg-gray-100 transition">
                                {editingEvent ? 'Save Changes' : 'Add Event'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}