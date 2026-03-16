import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  CircleDollarSign,
  LogOut,
  Plus,
  UserPlus,
  Users,
  Wallet,
  Receipt,
  Circle
} from "lucide-react";
import {
  clearAuthenticatedUser,
  getAuthenticatedUser,
  type AuthUser,
} from "../lib/auth";
import {
  createGroup,
  getAllGroups,
  markPayment,
  inviteToGroup,
  type Group,
  type GroupMember,
} from "../lib/appApi";

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Group Form
  const [showCreate, setShowCreate] = useState(false);
  const [newGroup, setNewGroup] = useState({
    title: "",
    description: "",
    totalAmount: "",
    count: "",
  });

  // Invites Form State (groupId -> identifier)
  const [invites, setInvites] = useState<Record<number, string>>({});

  useEffect(() => {
    const authUser = getAuthenticatedUser();
    if (!authUser) {
      navigate("/login");
      return;
    }
    setUser(authUser);
    fetchGroups();
  }, [navigate]);

  const fetchGroups = async () => {
    try {
      const data = await getAllGroups();
      setGroups(data.groups);
    } catch (err: any) {
      toast.error(err.message || "Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthenticatedUser();
    navigate("/login");
  };

  const handleCreateGroup = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      await createGroup({
        title: newGroup.title,
        description: newGroup.description,
        total_amount: Number(newGroup.totalAmount),
        count: Number(newGroup.count),
        owner_id: user.id,
      });
      toast.success("Group created!");
      setShowCreate(false);
      setNewGroup({ title: "", description: "", totalAmount: "", count: "" });
      fetchGroups();
    } catch (err: any) {
      toast.error(err.message || "Could not create group");
    }
  };

  const handleInvite = async (groupId: number) => {
    if (!user) return;
    const identifier = invites[groupId];
    if (!identifier) {
      toast.error("Please enter a username or email to invite");
      return;
    }

    try {
      await inviteToGroup(groupId, {
        requester_id: user.id,
        identifier: identifier.trim(),
      });
      toast.success("User invited successfully!");
      setInvites((prev) => ({ ...prev, [groupId]: "" }));
      fetchGroups();
    } catch (err: any) {
      toast.error(err.message || "Could not invite user");
    }
  };

  const handleMarkPayment = async (
    groupOwnerId: number | null,
    groupId: number,
    member: GroupMember,
    currentStatus: boolean
  ) => {
    if (!user) return;
    
    // Check permission according to backend logic:
    // "only the owner can update another member payment"
    if (user.id !== member.id && user.id !== groupOwnerId) {
       toast.error("Only the group owner can mark other people's payments as paid.");
       return;
    }

    try {
      await markPayment(groupId, {
        requester_id: user.id,
        user_id: member.id,
        is_paid: !currentStatus,
      });
      toast.success(`Marked as ${!currentStatus ? "Paid" : "Pending"}`);
      fetchGroups();
    } catch (err: any) {
      toast.error(err.message || "Could not update payment status");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020817] text-slate-200 selection:bg-emerald-500/30 font-sans">
      {/* Navbar */}
      <nav className="border-b border-white/5 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 box-border h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-400 to-cyan-400 flex items-center justify-center text-slate-950 font-bold">
              S
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Splittr
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-400">
              Welcome, <span className="text-white">{user?.name}</span>
            </span>
            <button
              onClick={handleLogout}
              className="p-2 mr-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">My Expenses</h1>
            <p className="text-slate-400 text-sm">
              Manage your shared payments and split bills easily.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 bg-white text-slate-950 px-5 py-2.5 rounded-full font-semibold hover:bg-slate-200 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            {showCreate ? <LogOut className="w-4 h-4 rotate-45" /> : <Plus className="w-4 h-4" />}
            {showCreate ? "Cancel" : "New Split"}
          </button>
        </div>

        {/* Create Group Form */}
        {showCreate && (
          <div className="mb-8 p-1 rounded-2xl bg-gradient-to-b from-white/10 to-transparent">
            <div className="bg-slate-900 rounded-2xl p-6 border border-white/5 shadow-2xl">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                Create New Split
              </h2>
              <form onSubmit={handleCreateGroup} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-sm font-medium text-slate-400">Title</label>
                  <input
                    type="text"
                    required
                    value={newGroup.title}
                    onChange={(e) => setNewGroup({ ...newGroup, title: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                    placeholder="e.g. Weekend Trip to Goa"
                  />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-sm font-medium text-slate-400">Description</label>
                  <input
                    type="text"
                    value={newGroup.description}
                    onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                    placeholder="Brief details about the expense"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Total Amount</label>
                  <div className="relative">
                    <CircleDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="number"
                      required
                      min="1"
                      value={newGroup.totalAmount}
                      onChange={(e) => setNewGroup({ ...newGroup, totalAmount: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Total People</label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="number"
                      required
                      min="1"
                      value={newGroup.count}
                      onChange={(e) => setNewGroup({ ...newGroup, count: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                      placeholder="Number of members sharing"
                    />
                  </div>
                </div>
                <div className="col-span-1 md:col-span-2 pt-2">
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-bold rounded-xl py-3 hover:opacity-90 transition-opacity cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                  >
                    Create Split
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Groups Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {groups.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-medium text-white mb-1">No splits yet</h3>
              <p className="text-slate-400">Create a new split to start sharing expenses.</p>
            </div>
          )}

          {groups.map((group) => {
            const splitAmount = (group.total_amount / group.count).toFixed(2);
            return (
              <div
                key={group.id}
                className="group relative bg-[#0a0f1e] border border-white/5 hover:border-white/10 rounded-3xl overflow-hidden transition-all hover:shadow-2xl hover:shadow-emerald-500/5"
              >
                {/* Visual Header */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />

                <div className="p-6 relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">
                          {group.title}
                        </h3>
                        {group.description && (
                           <p className="text-slate-400 text-sm line-clamp-1">{group.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-emerald-400">
                          ${group.total_amount}
                        </div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Total
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                          <Users className="w-4 h-4" /> People
                        </div>
                        <div className="text-lg font-medium text-white">
                          {group.users?.length || 0} / {group.count}
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                          <Wallet className="w-4 h-4" /> Per Person
                        </div>
                        <div className="text-lg font-medium text-white">${splitAmount}</div>
                      </div>
                    </div>

                    {/* Members List */}
                    <div className="space-y-4 mb-8 h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                      <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider sticky top-0 bg-[#0a0f1e] py-1 z-20">
                        Members ({group.users?.length || 0})
                      </h4>
                      {group.users?.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.02] hover:bg-white/[0.04] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold shadow-lg shrink-0">
                              {member.name[0]}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-white truncate">{member.name}</p>
                                {member.id !== group.owner_id && (
                                  <span className={`text-xs font-semibold ${member.is_paid ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {member.is_paid ? `Paid $${splitAmount}` : `Owes $${splitAmount}`}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 truncate">@{member.username}</p>
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              handleMarkPayment(group.owner_id, group.id, member, Boolean(member.is_paid))
                            }
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all border shrink-0 ${
                              member.is_paid
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                            }`}
                          >
                            {member.is_paid ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                              </>
                            ) : (
                              <>
                                <Circle className="w-3.5 h-3.5" /> Mark as Paid
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                      {group.users?.length === 0 && (
                        <div className="text-sm text-slate-500 italic py-2">
                          No members yet
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Invite Section */}
                  <div className="pt-6 border-t border-white/5 mt-auto">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                         <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          value={invites[group.id] || ""}
                          onChange={(e) =>
                            setInvites({ ...invites, [group.id]: e.target.value })
                          }
                          placeholder="Invite via username/email..."
                          className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                        />
                      </div>
                      <button
                        onClick={() => handleInvite(group.id)}
                        className="bg-white text-slate-900 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
      
      {/* Global styles for custom scrollbar hidden mostly via tailwind index.css ideally, but just in case minimal css */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
