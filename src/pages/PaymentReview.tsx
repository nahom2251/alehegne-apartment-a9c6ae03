import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Clock, Eye, Receipt, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const PaymentReview = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [proofs, setProofs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState('submitted');

  const fetchProofs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('payment_proofs')
      .select('*, apartments(label, tenant_name)')
      .order('created_at', { ascending: false });
    if (data) setProofs(data);
    setLoading(false);
  };

  useEffect(() => { fetchProofs(); }, []);

  const handleReview = async (proofId: string, status: 'approved' | 'rejected') => {
    if (!user) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('payment_proofs')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          notes: notes || null,
        })
        .eq('id', proofId);
      if (error) throw error;

      // If approved and has bill_id, mark the bill as paid
      const proof = proofs.find(p => p.id === proofId);
      if (status === 'approved' && proof?.bill_id) {
        const paidUpdate = { is_paid: true, paid_at: new Date().toISOString() };
        if (proof.bill_type === 'electricity') {
          await supabase.from('electricity_bills').update(paidUpdate).eq('id', proof.bill_id);
        } else if (proof.bill_type === 'water') {
          await supabase.from('water_bills').update(paidUpdate).eq('id', proof.bill_id);
        } else if (proof.bill_type === 'security') {
          await supabase.from('security_bills').update(paidUpdate).eq('id', proof.bill_id);
        } else if (proof.bill_type === 'rent') {
          await supabase.from('rent_bills').update(paidUpdate).eq('id', proof.bill_id);
        }
      }

      toast.success(status === 'approved' ? t('admin.paymentApproved') : t('admin.paymentRejected'));
      setSelectedProof(null);
      setNotes('');
      fetchProofs();
    } catch (error: any) {
      toast.error(error.message);
    }
    setProcessing(false);
  };

  const filtered = proofs.filter(p => filter === 'all' || p.status === filter);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusVariant = (status: string): 'default' | 'destructive' | 'secondary' => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('admin.paymentReview')}</h1>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="submitted" className="text-xs gap-1">
            <Clock className="w-3.5 h-3.5" />{t('admin.pending')}
          </TabsTrigger>
          <TabsTrigger value="approved" className="text-xs gap-1">
            <CheckCircle className="w-3.5 h-3.5" />{t('admin.approved')}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="text-xs gap-1">
            <XCircle className="w-3.5 h-3.5" />{t('admin.rejected')}
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs">{t('admin.all')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">{t('admin.noPayments')}</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(proof => (
            <Card key={proof.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedProof(proof); setNotes(proof.notes || ''); }}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(proof.status)}
                    <div>
                      <p className="font-medium text-sm">{proof.apartments?.label} — {proof.apartments?.tenant_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {proof.bill_type} • {proof.month && proof.year ? `${monthNames[proof.month - 1]} ${proof.year}` : format(new Date(proof.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    {proof.amount && <p className="font-bold text-sm">{proof.amount.toLocaleString()} {t('common.birr')}</p>}
                    <Badge variant={getStatusVariant(proof.status)} className="text-xs">
                      {proof.status === 'submitted' ? t('tenant.submitted') : proof.status === 'approved' ? t('bill.paid') : t('tenant.rejected')}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!selectedProof} onOpenChange={(open) => { if (!open) { setSelectedProof(null); setNotes(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.reviewPayment')}</DialogTitle>
          </DialogHeader>
          {selectedProof && (
            <div className="space-y-4">
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">{t('apt.tenant')}:</span> {selectedProof.apartments?.tenant_name}</p>
                <p><span className="font-medium">{t('nav.apartments')}:</span> {selectedProof.apartments?.label}</p>
                <p><span className="font-medium">{t('tenant.billType')}:</span> <span className="capitalize">{selectedProof.bill_type}</span></p>
                <p><span className="font-medium">{t('bill.month')}:</span> {selectedProof.month && selectedProof.year ? `${monthNames[selectedProof.month - 1]} ${selectedProof.year}` : 'N/A'}</p>
                {selectedProof.amount && <p><span className="font-medium">{t('bill.amount')}:</span> {selectedProof.amount.toLocaleString()} {t('common.birr')}</p>}
                <p><span className="font-medium">{t('admin.submittedAt')}:</span> {format(new Date(selectedProof.created_at), 'MMM dd, yyyy HH:mm')}</p>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <img src={selectedProof.image_url} alt="Payment proof" className="w-full max-h-64 object-contain bg-muted" />
              </div>

              {selectedProof.status === 'submitted' && (
                <>
                  <div>
                    <label className="text-sm font-medium">{t('admin.notes')}</label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('admin.notesPlaceholder')} className="mt-1" rows={2} />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleReview(selectedProof.id, 'approved')}
                      disabled={processing}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-2" />{t('admin.approve')}</>}
                    </Button>
                    <Button
                      onClick={() => handleReview(selectedProof.id, 'rejected')}
                      disabled={processing}
                      variant="destructive"
                      className="flex-1"
                    >
                      {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4 mr-2" />{t('admin.reject')}</>}
                    </Button>
                  </div>
                </>
              )}

              {selectedProof.notes && selectedProof.status !== 'submitted' && (
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t('admin.notes')}</p>
                  <p className="text-sm">{selectedProof.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentReview;
