import Link from "next/link";
import { db } from "@/lib/db";
import { getDashboardMerchantId } from "@/lib/dashboard-auth";

export default async function DashboardPage() {
  const merchantId = await getDashboardMerchantId();
  if (!merchantId) return <LoginNotice />;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [today, processing, shipped, revenue] = await Promise.all([
    db.order.count({ where: { merchantId, createdAt: { gte: start } } }),
    db.order.count({ where: { merchantId, status: { in: ["pending", "processing"] } } }),
    db.order.count({ where: { merchantId, status: "shipped" } }),
    db.order.aggregate({ where: { merchantId }, _sum: { total: true } }),
  ]);

  return <main dir="rtl" style={{padding:24,fontFamily:"Arial"}}>
    <h1>لوحة تحكم التاجر</h1><p>بياناتك الحقيقية من قاعدة البيانات.</p>
    <nav aria-label="تنقل لوحة التحكم" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginTop:16}}>
  <Link href="/dashboard/orders" style={{display:"block",padding:"14px 16px",border:"1px solid #ddd",borderRadius:12,background:"#111",color:"#fff",textDecoration:"none",textAlign:"center",fontWeight:700,minHeight:48,boxSizing:"border-box"}}>الطلبات</Link>
  <Link href="/dashboard/customers" style={{display:"block",padding:"14px 16px",border:"1px solid #ddd",borderRadius:12,background:"#111",color:"#fff",textDecoration:"none",textAlign:"center",fontWeight:700,minHeight:48,boxSizing:"border-box"}}>العملاء</Link>
  <Link href="/dashboard/shipping" style={{display:"block",padding:"14px 16px",border:"1px solid #ddd",borderRadius:12,background:"#111",color:"#fff",textDecoration:"none",textAlign:"center",fontWeight:700,minHeight:48,boxSizing:"border-box"}}>مركز الشحن</Link>
</nav><form action="/api/auth/logout" method="post" style={{marginTop:16}}><button type="submit">تسجيل الخروج</button></form>
    <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginTop:24}}>
      <Card label="الطلبات اليوم" value={String(today)} /><Card label="قيد المعالجة" value={String(processing)} /><Card label="تم الشحن" value={String(shipped)} /><Card label="الإيرادات" value={`${(revenue._sum.total ?? 0).toLocaleString("ar-DZ")} دج`} />
    </section>
  </main>;
}
function Card({label,value}:{label:string;value:string}) { return <article style={{padding:18,border:"1px solid #ddd",borderRadius:12}}><small>{label}</small><h2>{value}</h2></article>; }
function LoginNotice(){ return <main dir="rtl" style={{padding:24,fontFamily:"Arial"}}><h1>تسجيل الدخول إلى Orderia</h1><p>أدخل مفتاح API الخاص بالتاجر لفتح لوحة التحكم.</p><form action="/api/auth/login" method="post"><input name="apiKey" placeholder="مفتاح API" style={{padding:10}} /><button type="submit" style={{marginRight:8,padding:10}}>دخول</button></form><p>يمكن أيضًا استخدام POST إلى <code>/api/auth/login</code> مع JSON: <code>{'{"apiKey":"..."}'}</code>.</p></main>; }
