import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./components/Login";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Balance11Chart } from "./components/Balance11Chart";
import { Reserve11Chart } from "./components/Reserve11Chart";
import { Balance22Chart } from "./components/Balance22Chart";
import { Reserve22Chart } from "./components/Reserve22Chart";
import { Balance23Chart } from "./components/Balance23Chart";
import { Reserve23Chart } from "./components/Reserve23Chart";
import { BalanceFrezChart } from "./components/BalanceFrezChart";
import { ReserveFrezChart } from "./components/ReserveFrezChart";
import { BalancePerovoChart } from "./components/BalancePerovoChart";
import { ReservePerovoChart } from "./components/ReservePerovoChart";
import { BalanceKozhukhovoChart } from "./components/BalanceKozhukhovoChart";
import { Modeling11Chart } from "./components/Modeling11Chart";
import { Modeling22Chart } from "./components/Modeling22Chart";
import { Modeling23Chart } from "./components/Modeling23Chart";
import { ModelingFrezChart } from "./components/ModelingFrezChart";
import { ModelingPerovoChart } from "./components/ModelingPerovoChart";
import { ModelingKozhukhovoChart } from "./components/ModelingKozhukhovoChart";
import { ModelingReserve11Chart } from "./components/ModelingReserve11Chart";
import { ModelingReserve22Chart } from "./components/ModelingReserve22Chart";
import { ModelingReserve23Chart } from "./components/ModelingReserve23Chart";
import { ModelingReserveFrezChart } from "./components/ModelingReserveFrezChart";
import { ModelingReservePerovoChart } from "./components/ModelingReservePerovoChart";

import { Balance11NewChart } from "./components/Balance11NewChart";
import { GraphBuilder } from "./components/graph_builder";
import { Reserve11NewChart } from "./components/Reserve11NewChart";
import { Modeling11NewChart } from "./components/Modeling11NewChart";
import { ModelingReserve11NewChart } from "./components/ModelingReserve11NewChart";

import { Balance22NewChart } from "./components/Balance22NewChart";
import { Reserve22NewChart } from "./components/Reserve22NewChart";
import { Modeling22NewChart } from "./components/Modeling22NewChart";
import { ModelingReserve22NewChart } from "./components/ModelingReserve22NewChart";

import { Balance23NewChart } from "./components/Balance23NewChart";
import { Reserve23NewChart } from "./components/Reserve23NewChart";
import { Modeling23NewChart } from "./components/Modeling23NewChart";
import { ModelingReserve23NewChart } from "./components/ModelingReserve23NewChart";

import { BalanceFrezNewChart } from "./components/BalanceFrezNewChart";
import { ReserveFrezNewChart } from "./components/ReserveFrezNewChart";
import { ModelingFrezNewChart } from "./components/ModelingFrezNewChart";
import { ModelingReserveFrezNewChart } from "./components/ModelingReserveFrezNewChart";

import { BalanceKozhukhovoNewChart } from "./components/BalanceKozhukhovoNewChart";
import { ReserveKozhukhovoNewChart } from "./components/ReserveKozhukhovoNewChart";
import { ModelingKozhukhovoNewChart } from "./components/ModelingKozhukhovoNewChart";
import { ModelingReserveKozhukhovoNewChart } from "./components/ModelingReserveKozhukhovoNewChart";

import { BalancePerovoNewChart } from "./components/BalancePerovoNewChart";
import { ReservePerovoNewChart } from "./components/ReservePerovoNewChart";
import { ModelingPerovoNewChart } from "./components/ModelingPerovoNewChart";
import { ModelingReservePerovoNewChart } from "./components/ModelingReservePerovoNewChart";
import { BalanceLosNewChart } from "./components/BalanceLosNewChart";
import { TeploChart } from "./components/TeploChart";

// Электрические графики
import { BalanceVykhinoElectricChart } from "./components/BalanceVykhinoElectricChart";
import { ReserveVykhinoElectricChart } from "./components/ReserveVykhinoElectricChart";
import { BalanceIzmaylovoElectricChart } from "./components/BalanceIzmaylovoElectricChart";
import { ReserveIzmaylovoElectricChart } from "./components/ReserveIzmaylovoElectricChart";
import { BalanceLefortovoElectricChart } from "./components/BalanceLefortovoElectricChart";
import { ReserveLefortovoElectricChart } from "./components/ReserveLefortovoElectricChart";
import { BalanceProzhektorElectricChart } from "./components/BalanceProzhektorElectricChart";
import { ReserveProzhektorElectricChart } from "./components/ReserveProzhektorElectricChart";
import { BalanceFrezerElectricChart } from "./components/BalanceFrezerElectricChart";
import { ReserveFrezerElectricChart } from "./components/ReserveFrezerElectricChart";
import { BalanceAbramovoElectricChart } from "./components/BalanceAbramovoElectricChart";
import { ReserveAbramovoElectricChart } from "./components/ReserveAbramovoElectricChart";
import { BalanceBaskakovoElectricChart } from "./components/BalanceBaskakovoElectricChart";
import { ReserveBaskakovoElectricChart } from "./components/ReserveBaskakovoElectricChart";
import { BalanceVostochnayaElectricChart } from "./components/BalanceVostochnayaElectricChart";
import { ReserveVostochnayaElectricChart } from "./components/ReserveVostochnayaElectricChart";
import { BalanceGolyanovoElectricChart } from "./components/BalanceGolyanovoElectricChart";
import { ReserveGolyanovoElectricChart } from "./components/ReserveGolyanovoElectricChart";
import { BalanceGorkovskayaElectricChart } from "./components/BalanceGorkovskayaElectricChart";
import { ReserveGorkovskayaElectricChart } from "./components/ReserveGorkovskayaElectricChart";
import { BalanceKrasnoselskayaElectricChart } from "./components/BalanceKrasnoselskayaElectricChart";
import { ReserveKrasnoselskayaElectricChart } from "./components/ReserveKrasnoselskayaElectricChart";
import { BalanceParkovayaElectricChart } from "./components/BalanceParkovayaElectricChart";
import { ReserveParkovayaElectricChart } from "./components/ReserveParkovayaElectricChart";
import { BalanceTsimlyanskayaElectricChart } from "./components/BalanceTsimlyanskayaElectricChart";
import { ReserveTsimlyanskayaElectricChart } from "./components/ReserveTsimlyanskayaElectricChart";

// Электрические графики моделирования
import { ModelingBalanceVykhinoElectricChart } from "./components/ModelingBalanceVykhinoElectricChart";
import { ModelingReserveVykhinoElectricChart } from "./components/ModelingReserveVykhinoElectricChart";
import { ModelingBalanceIzmaylovoElectricChart } from "./components/ModelingBalanceIzmaylovoElectricChart";
import { ModelingReserveIzmaylovoElectricChart } from "./components/ModelingReserveIzmaylovoElectricChart";
import { ModelingBalanceLefortovoElectricChart } from "./components/ModelingBalanceLefortovoElectricChart";
import { ModelingReserveLefortovoElectricChart } from "./components/ModelingReserveLefortovoElectricChart";
import { ModelingBalanceProzhektorElectricChart } from "./components/ModelingBalanceProzhektorElectricChart";
import { ModelingReserveProzhektorElectricChart } from "./components/ModelingReserveProzhektorElectricChart";
import { ModelingBalanceFrezerElectricChart } from "./components/ModelingBalanceFrezerElectricChart";
import { ModelingReserveFrezerElectricChart } from "./components/ModelingReserveFrezerElectricChart";
import { ModelingBalanceAbramovoElectricChart } from "./components/ModelingBalanceAbramovoElectricChart";
import { ModelingReserveAbramovoElectricChart } from "./components/ModelingReserveAbramovoElectricChart";
import { ModelingBalanceBaskakovoElectricChart } from "./components/ModelingBalanceBaskakovoElectricChart";
import { ModelingReserveBaskakovoElectricChart } from "./components/ModelingReserveBaskakovoElectricChart";
import { ModelingBalanceVostochnayaElectricChart } from "./components/ModelingBalanceVostochnayaElectricChart";
import { ModelingReserveVostochnayaElectricChart } from "./components/ModelingReserveVostochnayaElectricChart";
import { ModelingBalanceGolyanovoElectricChart } from "./components/ModelingBalanceGolyanovoElectricChart";
import { ModelingReserveGolyanovoElectricChart } from "./components/ModelingReserveGolyanovoElectricChart";
import { ModelingBalanceGorkovskayaElectricChart } from "./components/ModelingBalanceGorkovskayaElectricChart";
import { ModelingReserveGorkovskayaElectricChart } from "./components/ModelingReserveGorkovskayaElectricChart";
import { ModelingBalanceKrasnoselskayaElectricChart } from "./components/ModelingBalanceKrasnoselskayaElectricChart";
import { ModelingReserveKrasnoselskayaElectricChart } from "./components/ModelingReserveKrasnoselskayaElectricChart";
import { ModelingBalanceParkovayaElectricChart } from "./components/ModelingBalanceParkovayaElectricChart";
import { ModelingReserveParkovayaElectricChart } from "./components/ModelingReserveParkovayaElectricChart";
import { ModelingBalanceTsimlyanskayaElectricChart } from "./components/ModelingBalanceTsimlyanskayaElectricChart";
import { ModelingReserveTsimlyanskayaElectricChart } from "./components/ModelingReserveTsimlyanskayaElectricChart";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Публичный маршрут для входа */}
        <Route path="/admin/login" element={<Login />} />
        <Route path="/login" element={<Login />} />
        
        {/* Защищенные маршруты */}
        <Route path="/admin" element={<ProtectedRoute><Navigate to="/admin/graph_builder" replace /></ProtectedRoute>} />
        <Route path="/admin/" element={<ProtectedRoute><Navigate to="/admin/graph_builder" replace /></ProtectedRoute>} />
        <Route path="/" element={<ProtectedRoute><Navigate to="/admin/graph_builder" replace /></ProtectedRoute>} />
        <Route path="/balance11" element={<ProtectedRoute><Balance11Chart /></ProtectedRoute>} />
        <Route path="/reserve11" element={<ProtectedRoute><Reserve11Chart /></ProtectedRoute>} />
        <Route path="/modeling11" element={<ProtectedRoute><Modeling11Chart /></ProtectedRoute>} />
        <Route path="/modelingreserve11" element={<ProtectedRoute><ModelingReserve11Chart /></ProtectedRoute>} />
        
        <Route path="/balance22" element={<ProtectedRoute><Balance22Chart /></ProtectedRoute>} />
        <Route path="/reserve22" element={<ProtectedRoute><Reserve22Chart /></ProtectedRoute>} />
        <Route path="/modeling22" element={<ProtectedRoute><Modeling22Chart /></ProtectedRoute>} />
        <Route path="/modelingreserve22" element={<ProtectedRoute><ModelingReserve22Chart /></ProtectedRoute>} />
        
        <Route path="/balance23" element={<ProtectedRoute><Balance23Chart /></ProtectedRoute>} />
        <Route path="/reserve23" element={<ProtectedRoute><Reserve23Chart /></ProtectedRoute>} />
        <Route path="/modeling23" element={<ProtectedRoute><Modeling23Chart /></ProtectedRoute>} />
        <Route path="/modelingreserve23" element={<ProtectedRoute><ModelingReserve23Chart /></ProtectedRoute>} />
        
        <Route path="/balancefrez" element={<ProtectedRoute><BalanceFrezChart /></ProtectedRoute>} />
        <Route path="/reservefrez" element={<ProtectedRoute><ReserveFrezChart /></ProtectedRoute>} />
        <Route path="/modelingfrez" element={<ProtectedRoute><ModelingFrezChart /></ProtectedRoute>} />
        <Route path="/modelingreservefrez" element={<ProtectedRoute><ModelingReserveFrezChart /></ProtectedRoute>} />
        
        <Route path="/balanceperovo" element={<ProtectedRoute><BalancePerovoChart /></ProtectedRoute>} />
        <Route path="/reserveperovo" element={<ProtectedRoute><ReservePerovoChart /></ProtectedRoute>} />
        <Route path="/modelingperovo" element={<ProtectedRoute><ModelingPerovoChart /></ProtectedRoute>} />
        <Route path="/modelingreserveperovo" element={<ProtectedRoute><ModelingReservePerovoChart /></ProtectedRoute>} />
        
        <Route path="/balancekozhukhovo" element={<ProtectedRoute><BalanceKozhukhovoChart /></ProtectedRoute>} />
        <Route path="/modelingkozhukhovo" element={<ProtectedRoute><ModelingKozhukhovoChart /></ProtectedRoute>} />
        
        <Route path="/balance11_new" element={<ProtectedRoute><Balance11NewChart /></ProtectedRoute>} />
        <Route path="/admin/graph_builder" element={<ProtectedRoute><GraphBuilder /></ProtectedRoute>} />
        {/* Fallback для совместимости */}
        <Route path="/graph_builder" element={<ProtectedRoute><Navigate to="/admin/graph_builder" replace /></ProtectedRoute>} />
        <Route path="/reserve11_new" element={<ProtectedRoute><Reserve11NewChart /></ProtectedRoute>} />
        <Route path="/modeling11_new" element={<ProtectedRoute><Modeling11NewChart /></ProtectedRoute>} />
        <Route path="/modelingreserve11_new" element={<ProtectedRoute><ModelingReserve11NewChart /></ProtectedRoute>} />

        <Route path="/balance22_new" element={<ProtectedRoute><Balance22NewChart /></ProtectedRoute>} />
        <Route path="/reserve22_new" element={<ProtectedRoute><Reserve22NewChart /></ProtectedRoute>} />
        <Route path="/modeling22_new" element={<ProtectedRoute><Modeling22NewChart /></ProtectedRoute>} />
        <Route path="/modelingreserve22_new" element={<ProtectedRoute><ModelingReserve22NewChart /></ProtectedRoute>} />

        <Route path="/balance23_new" element={<ProtectedRoute><Balance23NewChart /></ProtectedRoute>} />
        <Route path="/reserve23_new" element={<ProtectedRoute><Reserve23NewChart /></ProtectedRoute>} />
        <Route path="/modeling23_new" element={<ProtectedRoute><Modeling23NewChart /></ProtectedRoute>} />
        <Route path="/modelingreserve23_new" element={<ProtectedRoute><ModelingReserve23NewChart /></ProtectedRoute>} />

        <Route path="/balancefrez_new" element={<ProtectedRoute><BalanceFrezNewChart /></ProtectedRoute>} />
        <Route path="/reservefrez_new" element={<ProtectedRoute><ReserveFrezNewChart /></ProtectedRoute>} />
        <Route path="/modelingfrez_new" element={<ProtectedRoute><ModelingFrezNewChart /></ProtectedRoute>} />
        <Route path="/modelingreservefrez_new" element={<ProtectedRoute><ModelingReserveFrezNewChart /></ProtectedRoute>} />

        <Route path="/balancekozhukhovo_new" element={<ProtectedRoute><BalanceKozhukhovoNewChart /></ProtectedRoute>} />
        <Route path="/reservekozhukhovo_new" element={<ProtectedRoute><ReserveKozhukhovoNewChart /></ProtectedRoute>} />
        <Route path="/modelingkozhukhovo_new" element={<ProtectedRoute><ModelingKozhukhovoNewChart /></ProtectedRoute>} />
        <Route path="/modelingreservekozhukhovo_new" element={<ProtectedRoute><ModelingReserveKozhukhovoNewChart /></ProtectedRoute>} />

        <Route path="/balanceperovo_new" element={<ProtectedRoute><BalancePerovoNewChart /></ProtectedRoute>} />
        <Route path="/reserveperovo_new" element={<ProtectedRoute><ReservePerovoNewChart /></ProtectedRoute>} />
        <Route path="/modelingperovo_new" element={<ProtectedRoute><ModelingPerovoNewChart /></ProtectedRoute>} />
        <Route path="/modelingreserveperovo_new" element={<ProtectedRoute><ModelingReservePerovoNewChart /></ProtectedRoute>} />

        {/* Водоотведение */}
        <Route path="/balancelos_new" element={<ProtectedRoute><BalanceLosNewChart /></ProtectedRoute>} />

        {/* Электрические графики */}
        <Route path="/balancevykhino_electric" element={<ProtectedRoute><BalanceVykhinoElectricChart /></ProtectedRoute>} />
        <Route path="/reservevykhino_electric" element={<ProtectedRoute><ReserveVykhinoElectricChart /></ProtectedRoute>} />
        <Route path="/balanceizmaylovo_electric" element={<ProtectedRoute><BalanceIzmaylovoElectricChart /></ProtectedRoute>} />
        <Route path="/reserveizmaylovo_electric" element={<ProtectedRoute><ReserveIzmaylovoElectricChart /></ProtectedRoute>} />
        <Route path="/balancelefortovo_electric" element={<ProtectedRoute><BalanceLefortovoElectricChart /></ProtectedRoute>} />
        <Route path="/reservelefortovo_electric" element={<ProtectedRoute><ReserveLefortovoElectricChart /></ProtectedRoute>} />
        <Route path="/balanceprozhektor_electric" element={<ProtectedRoute><BalanceProzhektorElectricChart /></ProtectedRoute>} />
        <Route path="/reserveprozhektor_electric" element={<ProtectedRoute><ReserveProzhektorElectricChart /></ProtectedRoute>} />
        <Route path="/balancefrezer_electric" element={<ProtectedRoute><BalanceFrezerElectricChart /></ProtectedRoute>} />
        <Route path="/reservefrezer_electric" element={<ProtectedRoute><ReserveFrezerElectricChart /></ProtectedRoute>} />
        <Route path="/balanceabramovo_electric" element={<ProtectedRoute><BalanceAbramovoElectricChart /></ProtectedRoute>} />
        <Route path="/reserveabramovo_electric" element={<ProtectedRoute><ReserveAbramovoElectricChart /></ProtectedRoute>} />
        <Route path="/balancebaskakovo_electric" element={<ProtectedRoute><BalanceBaskakovoElectricChart /></ProtectedRoute>} />
        <Route path="/reservebaskakovo_electric" element={<ProtectedRoute><ReserveBaskakovoElectricChart /></ProtectedRoute>} />
        <Route path="/balancevostochnaya_electric" element={<ProtectedRoute><BalanceVostochnayaElectricChart /></ProtectedRoute>} />
        <Route path="/reservevostochnaya_electric" element={<ProtectedRoute><ReserveVostochnayaElectricChart /></ProtectedRoute>} />
        <Route path="/balancegolyanovo_electric" element={<ProtectedRoute><BalanceGolyanovoElectricChart /></ProtectedRoute>} />
        <Route path="/reservegolyanovo_electric" element={<ProtectedRoute><ReserveGolyanovoElectricChart /></ProtectedRoute>} />
        <Route path="/balancegorkovskaya_electric" element={<ProtectedRoute><BalanceGorkovskayaElectricChart /></ProtectedRoute>} />
        <Route path="/reservegorkovskaya_electric" element={<ProtectedRoute><ReserveGorkovskayaElectricChart /></ProtectedRoute>} />
        <Route path="/balancekrasnoselskaya_electric" element={<ProtectedRoute><BalanceKrasnoselskayaElectricChart /></ProtectedRoute>} />
        <Route path="/reservekrasnoselskaya_electric" element={<ProtectedRoute><ReserveKrasnoselskayaElectricChart /></ProtectedRoute>} />
        <Route path="/balanceparkovaya_electric" element={<ProtectedRoute><BalanceParkovayaElectricChart /></ProtectedRoute>} />
        <Route path="/reserveparkovaya_electric" element={<ProtectedRoute><ReserveParkovayaElectricChart /></ProtectedRoute>} />
        <Route path="/balancetsimlyanskaya_electric" element={<ProtectedRoute><BalanceTsimlyanskayaElectricChart /></ProtectedRoute>} />
        <Route path="/reservetsimlyanskaya_electric" element={<ProtectedRoute><ReserveTsimlyanskayaElectricChart /></ProtectedRoute>} />

        {/* Электрические графики моделирования */}
        <Route path="/modelingbalancevykhino_electric" element={<ProtectedRoute><ModelingBalanceVykhinoElectricChart /></ProtectedRoute>} />
        <Route path="/modelingreservevykhino_electric" element={<ProtectedRoute><ModelingReserveVykhinoElectricChart /></ProtectedRoute>} />
        <Route path="/modelingbalanceizmaylovo_electric" element={<ProtectedRoute><ModelingBalanceIzmaylovoElectricChart /></ProtectedRoute>} />
        <Route path="/modelingreserveizmaylovo_electric" element={<ProtectedRoute><ModelingReserveIzmaylovoElectricChart /></ProtectedRoute>} />
        <Route path="/modelingbalancelefortovo_electric" element={<ProtectedRoute><ModelingBalanceLefortovoElectricChart /></ProtectedRoute>} />
        <Route path="/modelingreservelefortovo_electric" element={<ProtectedRoute><ModelingReserveLefortovoElectricChart /></ProtectedRoute>} />
        <Route path="/modelingbalanceprozhektor_electric" element={<ProtectedRoute><ModelingBalanceProzhektorElectricChart /></ProtectedRoute>} />
        <Route path="/modelingreserveprozhektor_electric" element={<ProtectedRoute><ModelingReserveProzhektorElectricChart /></ProtectedRoute>} />
        <Route path="/modelingbalancefrezer_electric" element={<ProtectedRoute><ModelingBalanceFrezerElectricChart /></ProtectedRoute>} />
        <Route path="/modelingreservefrezer_electric" element={<ProtectedRoute><ModelingReserveFrezerElectricChart /></ProtectedRoute>} />
        <Route path="/modelingbalanceabramovo_electric" element={<ProtectedRoute><ModelingBalanceAbramovoElectricChart /></ProtectedRoute>} />
        <Route path="/modelingreserveabramovo_electric" element={<ProtectedRoute><ModelingReserveAbramovoElectricChart /></ProtectedRoute>} />
        <Route path="/modelingbalancebaskakovo_electric" element={<ProtectedRoute><ModelingBalanceBaskakovoElectricChart /></ProtectedRoute>} />
        <Route path="/modelingreservebaskakovo_electric" element={<ProtectedRoute><ModelingReserveBaskakovoElectricChart /></ProtectedRoute>} />
        <Route path="/modelingbalancevostochnaya_electric" element={<ProtectedRoute><ModelingBalanceVostochnayaElectricChart /></ProtectedRoute>} />
        <Route path="/modelingreservevostochnaya_electric" element={<ProtectedRoute><ModelingReserveVostochnayaElectricChart /></ProtectedRoute>} />
        <Route path="/modelingbalancegolyanovo_electric" element={<ProtectedRoute><ModelingBalanceGolyanovoElectricChart /></ProtectedRoute>} />
        <Route path="/modelingreservegolyanovo_electric" element={<ProtectedRoute><ModelingReserveGolyanovoElectricChart /></ProtectedRoute>} />
        <Route path="/modelingbalancegorkovskaya_electric" element={<ProtectedRoute><ModelingBalanceGorkovskayaElectricChart /></ProtectedRoute>} />
        <Route path="/modelingreservegorkovskaya_electric" element={<ProtectedRoute><ModelingReserveGorkovskayaElectricChart /></ProtectedRoute>} />
        <Route path="/modelingbalancekrasnoselskaya_electric" element={<ProtectedRoute><ModelingBalanceKrasnoselskayaElectricChart /></ProtectedRoute>} />
        <Route path="/modelingreservekrasnoselskaya_electric" element={<ProtectedRoute><ModelingReserveKrasnoselskayaElectricChart /></ProtectedRoute>} />
        <Route path="/modelingbalanceparkovaya_electric" element={<ProtectedRoute><ModelingBalanceParkovayaElectricChart /></ProtectedRoute>} />
        <Route path="/modelingreserveparkovaya_electric" element={<ProtectedRoute><ModelingReserveParkovayaElectricChart /></ProtectedRoute>} />
        <Route path="/modelingbalancetsimlyanskaya_electric" element={<ProtectedRoute><ModelingBalanceTsimlyanskayaElectricChart /></ProtectedRoute>} />
        <Route path="/modelingreservetsimlyanskaya_electric" element={<ProtectedRoute><ModelingReserveTsimlyanskayaElectricChart /></ProtectedRoute> } />

        {/* Графики тепла и электричества - публичные маршруты без префиксов (должен быть последним) */}
        <Route path="/:chartId" element={<TeploChart />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
