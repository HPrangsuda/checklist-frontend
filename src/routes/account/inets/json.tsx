import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createFileRoute, useSearch } from '@tanstack/react-router';
import { useTranslation } from '@/core/contexts/language-context';
import { api } from '@/core/interceptor/api.interceptor';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ResponseDTO } from '@/core/types/common';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/account/inets/json')({
  component: Json,
});

interface JsonNodeProps {
  data: any;
  name?: string;
  level?: number;
}

export interface InetDTO {
  id: number;
  isCredit: boolean;
  sellerId: string | null;
  departmentName: string | null;
  orderNumber: string | null;
  message388: string | null;
  messageT01: string | null;
  message81: string | null;
  gen388Step: string | null;
  genT01Step: string | null;
  gen81Step: string | null;
  text388: string | null;
  textT01: string | null;
  text81: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function JsonNode({ data, name, level = 0 }: JsonNodeProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getDataType = (value: any): string => {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  };

  const getValueColor = (type: string): string => {
    switch (type) {
      case 'string':
        return 'text-green-600';
      case 'number':
        return 'text-blue-600';
      case 'boolean':
        return 'text-purple-600';
      case 'null':
        return 'text-gray-500';
      default:
        return 'text-gray-900';
    }
  };

  const renderValue = (value: any, type: string) => {
    switch (type) {
      case 'string':
        return <span className={getValueColor(type)}>"{value}"</span>;
      case 'null':
        return <span className={getValueColor(type)}>null</span>;
      default:
        return <span className={getValueColor(type)}>{String(value)}</span>;
    }
  };

  const type = getDataType(data);
  const isExpandable = type === 'object' || type === 'array';
  const isEmpty =
    isExpandable &&
    (type === 'array' ? data.length === 0 : Object.keys(data).length === 0);

  if (!isExpandable) {
    return (
      <div className="flex items-center gap-2 py-0.5" style={{ paddingLeft: `${level * 20}px` }}>
        {name && (
          <>
            <span className="text-blue-800 font-medium">"{name}"</span>
            <span className="text-gray-500">:</span>
          </>
        )}
        {renderValue(data, type)}
      </div>
    );
  }

  const entries: [string | number, any][] =
    type === 'array'
      ? data.map((item: any, index: number): [number, any] => [index, item])
      : Object.entries(data);

  return (
    <div>
      <div
        className="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-gray-50 rounded"
        style={{ paddingLeft: `${level * 20}px` }}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {!isEmpty && (isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
        {isEmpty && <div className="w-4" />}
        {name && (
          <>
            <span className="text-blue-800 font-medium">"{name}"</span>
            <span className="text-gray-500">:</span>
          </>
        )}
        <span className="text-gray-600">{type === 'array' ? '[' : '{'}</span>
        {isEmpty && <span className="text-gray-600">{type === 'array' ? ']' : '}'}</span>}
        <Badge variant="outline" className="text-xs">
          {type} {!isEmpty && `(${entries.length})`}
        </Badge>
      </div>
      {!isCollapsed && !isEmpty && (
        <div>
          {entries.map(([key, value], index) => (
            <JsonNode
              key={String(key)}
              data={value}
              name={type === 'array' ? undefined : String(key)}
              level={level + 1}
            />
          ))}
          <div className="text-gray-600 py-0.5" style={{ paddingLeft: `${level * 20}px` }}>
            {type === 'array' ? ']' : '}'}
          </div>
        </div>
      )}
    </div>
  );
}

function Json() {
  const search = useSearch({ from: '__root__' }) as { id?: string; type?: string };
  const [parsedJson, setParsedJson] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const isCredit = search?.id ? String(search.id).startsWith('4') : false;
  const typeCode = search?.type;

  useEffect(() => {
    if (search?.id) {
      fetchData(search.id);
    }
  }, [search]);

  const fetchData = async (id: string) => {
    setLoading(true);
    setError('');
    setParsedJson(null);

    try {
      const response = await api.get<ResponseDTO<InetDTO>>(`/api/account/inets/get/${id}`);

      if (!response.status) {
        toast.error(t('message.message', response.message));
        return;
      }

      const responseData = response.data;

      if(typeCode == "81"){
        const rawJson = responseData?.text81;
        if (!rawJson) {
          throw new Error('No invoice JSON data available');
        }  
        setParsedJson(JSON.parse(rawJson));
      }

      if(typeCode == "388"){
        const rawJson = responseData?.text388;
        if (!rawJson) {
          throw new Error('No invoice JSON data available');
        }  
        setParsedJson(JSON.parse(rawJson));
      }

      if(typeCode == "T01"){
        const rawJson = responseData?.textT01;
        if (!rawJson) {
          throw new Error('No receipt JSON data available');
        }  
        setParsedJson(JSON.parse(rawJson));
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to load or parse data');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (isCredit) return 'Credit Invoice JSON Data';
    return `JSON Data Viewer ${typeCode ? `- ${typeCode}` : ''}`;
  };

  const getDescription = () => {
    const baseDesc = 'View and navigate through JSON data structure with collapsible nodes';
    if (search?.id) {
      return `${baseDesc} for ID: ${search.id}`;
    }
    return baseDesc;
  };

  return (
    <div className="p-4 max-w-full mx-auto">
      <Card className="shadow-none h-[calc(100%-110px)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-md">{getTitle()}</CardTitle>
              <CardDescription>{getDescription()}</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-12 text-gray-600">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <p>Loading JSON data...</p>
              </div>
            </div>
          ) : parsedJson ? (
            <div className="border rounded-lg p-4 bg-gray-50 overflow-auto font-mono text-sm">
              <JsonNode data={parsedJson} />
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-500">
              {error ? (
                <div className="text-center">
                  <p className="text-red-500 font-medium text-lg mb-2">Error Loading Data</p>
                  <p className="text-red-400 mb-4">{error}</p>
                  <Button variant="outline" onClick={() => search?.id && fetchData(search.id)}>
                    Try Again
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium mb-2">No JSON Data Available</p>
                  <p className="text-sm">
                    {search?.id
                      ? 'Waiting for data to load...'
                      : 'Please provide an ID parameter in the URL (?id=12345)'}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}