import { ChevronLeft, ChevronRight, Search, Settings, HelpCircle, Menu } from 'lucide-react';
import { format } from 'date-fns';

export default function CalendarHeader({ currentDate, onPrev, onNext, onToday, view, setView }) {
  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-white text-gray-700 h-16 shadow-sm">
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2 mr-4">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-xl leading-none">S</span>
          </div>
          <h1 className="text-xl font-medium tracking-tight text-gray-600">
            Shnoor <span className="font-normal text-gray-500">International LLC</span>
          </h1>
        </div>
        
        <button 
          onClick={onToday}
          className="px-4 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 text-sm font-medium transition-colors text-gray-700 ml-4"
        >
          Today
        </button>
        
        <div className="flex items-center gap-1 ml-4 text-gray-500">
          <button onClick={onPrev} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={onNext} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
        
        <h2 className="text-xl font-normal ml-4 min-w-[150px] text-gray-600">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all group">
          <Search size={18} className="text-gray-400 group-focus-within:text-blue-500" />
          <input 
            type="text" 
            placeholder="Search" 
            className="bg-transparent border-none outline-none ml-2 w-48 text-sm text-gray-700"
          />
        </div>
        
        <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden ml-4">
          {['Day', 'Week', 'Month'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                view === v ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 ml-4">
          <button className="p-2.5 hover:bg-gray-100 rounded-full text-gray-500">
            <HelpCircle size={22} />
          </button>
          <button className="p-2.5 hover:bg-gray-100 rounded-full text-gray-500">
            <Settings size={22} />
          </button>
          <div className="w-9 h-9 bg-emerald-600 rounded-full flex items-center justify-center ml-2 border-2 border-white shadow-sm font-bold text-white text-xs">
            P
          </div>
        </div>
      </div>
    </header>
  );
}
