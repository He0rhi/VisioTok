import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { API_CONFIG } from '../../config';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function AdminStats() {
  const [callStats, setCallStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('days');
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_CONFIG.API_HOST}:5000/stats/calls`);
        setCallStats(response.data);
      } catch (error) {
        console.error('Error fetching call statistics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    if (callStats.length > 0) {
      updateChartData();
    }
  }, [callStats, filter]);

  const groupData = (data, interval) => {
    const grouped = data.reduce((acc, stat) => {
      const date = new Date(stat.startTime);
      let key;

      if (interval === 'days') {
        key = date.toISOString().split('T')[0]; 
      } else if (interval === 'weeks') {
        const yearStart = new Date(date.getFullYear(), 0, 1);
        const week = Math.ceil(((date - yearStart) / 86400000 + yearStart.getDay() + 1) / 7); 
        key = `${date.getFullYear()}-W${week}`;
      } else if (interval === 'months') {
        key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`; 
      }

      acc[key] = (acc[key] || 0) + 1; 
      return acc;
    }, {});

    const labels = Object.keys(grouped);
    const counts = Object.values(grouped);

    return { labels, counts };
  };

  const updateChartData = () => {
    const { labels, counts } = groupData(callStats, filter);

    setChartData({
      labels,
      datasets: [
        {
          label: 'Number of Calls',
          data: counts,
          fill: false,
          borderColor: 'rgb(255, 0, 0)',
          tension: 0.1,
        },
      ],
    });
  };

  const options = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'СТАТИСТИКА ЗВОНКОВ',
      },
      tooltip: {
        callbacks: {
          label: function (tooltipItem) {
            return `ДАТА: ${tooltipItem.label}, КОЛ-ВО ЗВОНКОВ: ${tooltipItem.raw}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'category',
        title: {
          display: true,
          text: filter === 'days' ? 'Date (YYYY-MM-DD)' : filter === 'weeks' ? 'Week (YYYY-W)' : 'Month (YYYY-MM)',
        },
        ticks: {
          autoSkip: true,
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        title: {
          display: true,
          text: 'Number of Calls',
        },
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return <p>Loading statistics...</p>;
  }

  if (callStats.length === 0) {
    return <p>No data available to display.</p>;
  }

  return (
    <div>
      <div className="profile-page-header">
        <Link to="/" className="logo">
          <h1>VISIOTOK</h1>
        </Link>
      </div>
      <div className="profile-page-body">
        <h1>Statistics</h1>
        <div className="stats-buttons">
          <button onClick={() => setFilter('days')} className={filter === 'days' ? 'active' : ''}>
            Days
          </button>
          <button onClick={() => setFilter('weeks')} className={filter === 'weeks' ? 'active' : ''}>
            Weeks
          </button>
          <button onClick={() => setFilter('months')} className={filter === 'months' ? 'active' : ''}>
            Months
          </button>
        </div>
        <Line className="line-data" data={chartData} options={options} />
      </div>
    </div>
  );
}
