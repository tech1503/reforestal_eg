import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next'; // IMPORTADO

const DateRangeFilter = ({ range, setRange, onExport }) => {
  const { t } = useTranslation();

  const presets = [
    { label: 'Last 7 Days', value: 7 },
    { label: 'Last 30 Days', value: 30 },
    { label: 'Last 90 Days', value: 90 },
    { label: 'All Time', value: 3650 },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-center bg-white p-2 rounded-lg border shadow-sm">
      <Select 
        defaultValue="30" 
        onValueChange={(val) => {
           const days = parseInt(val);
           setRange({
             from: subDays(new Date(), days),
             to: new Date()
           });
        }}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select Range" />
        </SelectTrigger>
        <SelectContent>
          {presets.map(p => (
            <SelectItem key={p.value} value={p.value.toString()}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <div className="text-xs text-slate-500 font-medium px-2">
         {range.from ? format(range.from, 'MMM d, yyyy') : 'Start'} - {range.to ? format(range.to, 'MMM d, yyyy') : 'End'}
      </div>

      <div className="flex-1" />
      
      <Button variant="outline" size="sm" onClick={onExport} className="gap-2">
        <Download className="w-4 h-4" />
        {/* common.download */}
        {t('common.download')} CSV
      </Button>
    </div>
  );
};

export default DateRangeFilter;