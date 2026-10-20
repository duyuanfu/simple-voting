import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { 
  FileSpreadsheet, 
  Search, 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RotateCcw,
  Download
} from 'lucide-react';

export default function VoteAudit() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [validFilter, setValidFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchCampaign = async () => {
    try {
      const res = await api.get(`/campaigns/${id}`);
      setCampaign(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        page_size: pageSize,
      };
      if (search.trim()) params.search = search.trim();
      if (validFilter !== '') params.is_valid = parseInt(validFilter, 10);

      const res = await api.get(`/analytics/campaigns/${id}/logs`, { params });
      setLogs(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Failed to load logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  useEffect(() => {
    fetchLogs();
  }, [id, page, validFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleInvalidate = async (logId) => {
    if (!window.confirm('确定要将该条投票标记为作废作弊票吗？系统将自动扣减对应作品票数。')) {
      return;
    }
    try {
      await api.post(`/analytics/campaigns/${id}/logs/${logId}/invalidate`);
      // Update local state
      setLogs(prev => prev.map(l => l.id === logId ? { ...l, is_valid: 0 } : l));
      alert('作废成功，对应候选作品已扣除 1 票');
    } catch (err) {
      alert(err.response?.data?.detail || '作废失败');
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const res = await api.get(`/analytics/campaigns/${id}/export`, {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `campaign_${campaign?.code || id}_report.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('导出报表失败');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/admin/campaigns" className="text-slate-400 hover:text-slate-600">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
              审计与作弊治理
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            投票明细审计 - {campaign?.title || '加载中...'}
          </h1>
        </div>

        <button
          onClick={handleExportExcel}
          disabled={exporting}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-md shadow-emerald-500/20 transition disabled:opacity-50"
        >
          <FileSpreadsheet className="w-4 h-4" />
          {exporting ? '生成报表中...' : '一键导出标准多 Sheet Excel'}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索来源 IP 或 设备指纹..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-medium hover:bg-slate-800 transition"
          >
            搜索
          </button>
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={validFilter}
            onChange={(e) => {
              setValidFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
          >
            <option value="">全部状态</option>
            <option value="1">仅看有效票</option>
            <option value="0">仅看已作废票</option>
          </select>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="px-4 py-3.5">流水ID</th>
                <th className="px-4 py-3.5">投票时间 (UTC)</th>
                <th className="px-4 py-3.5">所投作品</th>
                <th className="px-4 py-3.5">投票人实名</th>
                <th className="px-4 py-3.5">所属单位</th>
                <th className="px-4 py-3.5">客户端 IP</th>
                <th className="px-4 py-3.5">设备指纹</th>
                <th className="px-4 py-3.5">有效状态</th>
                <th className="px-4 py-3.5 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    加载审计流水中...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    暂无符合条件的投票流水记录
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono text-slate-400">#{log.id}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 max-w-[160px] truncate">
                      {log.candidate_title || `作品 ID: ${log.candidate_id}`}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {log.voter_info?.real_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {log.voter_info?.unit || log.voter_info?.department || '未登记'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">{log.client_ip}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400" title={log.visitor_id}>
                      {log.visitor_id.substring(0, 12)}...
                    </td>
                    <td className="px-4 py-3">
                      {log.is_valid === 1 ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                          <CheckCircle className="w-3.5 h-3.5" />
                          有效票
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-500 font-medium">
                          <XCircle className="w-3.5 h-3.5" />
                          已作废
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {log.is_valid === 1 ? (
                        <button
                          onClick={() => handleInvalidate(log.id)}
                          className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition font-medium"
                          title="作废该票并自动扣除作品票数"
                        >
                          作废
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>共 {total} 条投票流水</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50"
            >
              上一页
            </button>
            <span className="px-2 py-1">第 {page} 页</span>
            <button
              disabled={page * pageSize >= total}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
