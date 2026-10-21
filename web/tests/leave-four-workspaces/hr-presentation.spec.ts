import {test,expect} from '@playwright/test';
import {unambiguousNameIndex} from '../../src/lib/ui/unambiguous-name-index';
import {availableLeaveUnits,leaveBalanceState,leaveRiskAssessment} from '../../src/lib/ui/leave-balance-presentation';
import type {HrAdminLeaveBalance} from '../../src/lib/types';
test('policy identity is order-independent and rejects normalization collisions',()=>{
 for(const items of [[{id:'a',name:' Annual '},{id:'b',name:'ANNUAL'}],[{id:'b',name:'ANNUAL'},{id:'a',name:' Annual '}]]){const index=unambiguousNameIndex(items);expect(index.isAmbiguous('annual')).toBe(true);expect(index.resolve('Annual')).toBeUndefined();}
 const unique=unambiguousNameIndex([{id:'a',name:'Annual'},{id:'a',name:' Annual '},{id:'b',name:'Sick'}]);expect(unique.resolve('ANNUAL')?.id).toBe('a');expect(unique.isAmbiguous('Annual')).toBe(false);expect(unique.resolve('missing')).toBeUndefined();
});
test('states report exact facts without an invented low threshold',()=>{
 const row=(closing:string,reserved:string)=>({closing_balance:closing,reserved_amount:reserved} as HrAdminLeaveBalance);
 expect(leaveBalanceState(row('0','0'))).toBe('No reservations');expect(leaveBalanceState(row('0.01','0'))).toBe('No reservations');expect(leaveBalanceState(row('1','0'))).toBe('No reservations');expect(leaveBalanceState(row('2','0'))).toBe('No reservations');expect(leaveBalanceState(row('10','1'))).toBe('Reserved');expect(leaveBalanceState(row('1','2'))).toBe('Reserved');expect(leaveBalanceState(row('-0.01','0'))).toBe('Negative available');expect(availableLeaveUnits(row('1','2'))).toBe(1);expect(availableLeaveUnits(row('0','2'))).toBe(0);expect(availableLeaveUnits(row('-0.01','2'))).toBe(-0.01);expect(leaveRiskAssessment()).toBe('Not assessed');
});
