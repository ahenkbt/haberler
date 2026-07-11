import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useListModules, useUpdateModules, getListModulesQueryKey } from "@workspace/api-client-react";
import { GripVertical, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function AnasayfaModulleri() {
  const { data: modules, isLoading } = useListModules();
  const updateModules = useUpdateModules();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [localModules, setLocalModules] = useState<any[]>([]);

  useEffect(() => {
    if (modules) {
      setLocalModules([...modules].sort((a, b) => a.position - b.position));
    }
  }, [modules]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...localModules];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setLocalModules(newItems);
  };

  const moveDown = (index: number) => {
    if (index === localModules.length - 1) return;
    const newItems = [...localModules];
    [newItems[index + 1], newItems[index]] = [newItems[index], newItems[index + 1]];
    setLocalModules(newItems);
  };

  const toggleModule = (id: number, enabled: boolean) => {
    setLocalModules(items => 
      items.map(m => m.id === id ? { ...m, enabled } : m)
    );
  };

  const handleSave = () => {
    const data = localModules.map((m, idx) => ({
      id: m.id,
      enabled: m.enabled,
      position: idx
    }));
    
    updateModules.mutate({ data: { modules: data } }, {
      onSuccess: () => {
        toast({ title: "Sıralama kaydedildi" });
        queryClient.invalidateQueries({ queryKey: getListModulesQueryKey() });
      }
    });
  };

  return (
    <AdminLayout title="Anasayfa Modülleri">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Anasayfa Modül Yönetimi</h1>
        <div className="flex gap-2">
          <Button variant="outline">Önizle →</Button>
          <Button 
            className="bg-[#e61e25] hover:bg-[#c9181e] text-white" 
            onClick={handleSave}
            disabled={updateModules.isPending}
          >
            Sıralı Kaydet
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-md shadow-sm border p-4">
            <h3 className="font-bold text-lg mb-4 text-gray-700">Modül Sırası</h3>
            
            {isLoading ? (
              <div className="py-12 text-center text-gray-500">Yükleniyor...</div>
            ) : (
              <div className="space-y-2">
                {localModules.map((mod, idx) => (
                  <div key={mod.id} className="flex items-center gap-4 p-3 border rounded-md bg-white hover:bg-gray-50 transition-colors group">
                    <div className="flex flex-col gap-1 text-gray-300 group-hover:text-gray-500">
                      <button onClick={() => moveUp(idx)} disabled={idx===0} className="hover:text-gray-800 disabled:opacity-30">▲</button>
                      <button onClick={() => moveDown(idx)} disabled={idx===localModules.length-1} className="hover:text-gray-800 disabled:opacity-30">▼</button>
                    </div>
                    
                    <div className={`w-1 h-10 rounded-full ${mod.accentColor ? `bg-[${mod.accentColor}]` : 'bg-gray-300'}`} style={{ backgroundColor: mod.accentColor || '#ccc' }}></div>
                    
                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                      <GripVertical className="w-5 h-5 text-gray-400" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-bold text-sm text-gray-900">{mod.name}</div>
                      <div className="text-xs text-gray-500">{mod.description}</div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500">{mod.enabled ? 'Aktif' : 'Pasif'}</span>
                        <Switch checked={mod.enabled} onCheckedChange={(e) => toggleModule(mod.id, e)} />
                      </div>
                      <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-700">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-50 rounded-md border p-4">
            <h3 className="font-bold text-md mb-4 text-gray-700">Sayfa Düzeni Önizleme</h3>
            <div className="space-y-2">
              {localModules.filter(m => m.enabled).map((mod, idx) => (
                <div key={mod.id} className="flex gap-3 text-sm items-center p-2 bg-white rounded border border-gray-100">
                  <span className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">{idx + 1}</span>
                  <span className="text-gray-700">{mod.name}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-blue-50 text-blue-800 p-4 rounded-md border border-blue-100 text-sm">
            <strong>Kullanım:</strong> Sol taraftaki okları kullanarak modüllerin sırasını değiştirebilirsiniz. Değişiklikleri uygulamak için "Sıralı Kaydet" butonuna basmayı unutmayın.
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}