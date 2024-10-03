import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Module {
  id: string;
  moduleCode: string;
  faculty: string;
  course: string;
}

@Injectable({
  providedIn: 'root'
})
export class ModuleService {
  private modulesCollection = this.firestore.collection<Module>('modules');

  constructor(private firestore: AngularFirestore) {}

  getModules(): Observable<Module[]> {
    return this.modulesCollection.snapshotChanges().pipe(
      map(actions => actions.map(action => {
        const data = action.payload.doc.data() as Omit<Module, 'id'>;
        const id = action.payload.doc.id;
        return { id, ...data }; // Combine id with data
      }))
    );
  }

  addModule(module: Omit<Module, 'id'>): Promise<void> {
    const id = this.firestore.createId();
    return this.modulesCollection.doc(id).set({ ...module, id });
  }

  // Other methods...
}
