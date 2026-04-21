'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { getPetsByOwner, addPet, updatePet, deletePet } from '@/lib/firestore'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BottomNav } from '@/components/layout/BottomNav'
import type { Pet, PetSize } from '@/types'

const SIZE_LABELS: Record<PetSize, string> = {
  small: 'Pequeño (< 10kg)',
  medium: 'Mediano (10-25kg)',
  large: 'Grande (> 25kg)',
}

const emptyPet = {
  name: '',
  breed: '',
  age: 1,
  weight: 5,
  size: 'small' as PetSize,
  medicalNotes: '',
}

export default function PetsPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const authLoading = useAuthStore((s) => s.loading)
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPet, setEditingPet] = useState<Pet | null>(null)
  const [form, setForm] = useState(emptyPet)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) { router.replace('/login'); return }
    if (!user) return
    loadPets()
  }, [user, authLoading, router])

  async function loadPets() {
    if (!user) return
    const data = await getPetsByOwner(user.uid)
    setPets(data)
    setLoading(false)
  }

  function openAdd() {
    setEditingPet(null)
    setForm(emptyPet)
    setShowForm(true)
  }

  function openEdit(pet: Pet) {
    setEditingPet(pet)
    setForm({
      name: pet.name,
      breed: pet.breed,
      age: pet.age,
      weight: pet.weight,
      size: pet.size,
      medicalNotes: pet.medicalNotes ?? '',
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!user || !form.name.trim() || !form.breed.trim()) {
      toast.error('Nombre y raza son obligatorios')
      return
    }
    setSaving(true)
    try {
      if (editingPet) {
        await updatePet(editingPet.id, form)
        toast.success('Mascota actualizada')
      } else {
        await addPet({ ...form, ownerId: user.uid, photos: [], vaccinations: [] })
        toast.success('Mascota agregada 🐾')
      }
      setShowForm(false)
      await loadPets()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(petId: string) {
    if (!confirm('¿Eliminar esta mascota?')) return
    try {
      await deletePet(petId)
      toast.success('Mascota eliminada')
      await loadPets()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  if (showForm) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
            ←
          </button>
          <h1 className="font-bold text-lg">
            {editingPet ? 'Editar mascota' : 'Nueva mascota'}
          </h1>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div className="space-y-1">
            <Label>Nombre *</Label>
            <Input
              placeholder="Firulais"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <Label>Raza *</Label>
            <Input
              placeholder="Labrador"
              value={form.breed}
              onChange={(e) => setForm({ ...form, breed: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Edad (años)</Label>
              <Input
                type="number"
                min={0}
                max={30}
                value={form.age}
                onChange={(e) => setForm({ ...form, age: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-1">
              <Label>Peso (kg)</Label>
              <Input
                type="number"
                min={0.5}
                max={100}
                step={0.5}
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: parseFloat(e.target.value) || 5 })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Tamaño</Label>
            <div className="space-y-2">
              {(Object.keys(SIZE_LABELS) as PetSize[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setForm({ ...form, size: s })}
                  className={`w-full rounded-xl border-2 p-3 text-left transition-all ${
                    form.size === s ? 'border-primary bg-primary/5' : 'border-border bg-card'
                  }`}
                >
                  <p className="font-medium text-sm">{SIZE_LABELS[s]}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Notas médicas (opcional)</Label>
            <textarea
              className="w-full bg-muted rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Alergias, medicamentos, etc."
              rows={3}
              value={form.medicalNotes}
              onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })}
            />
          </div>

          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : editingPet ? 'Actualizar' : 'Agregar mascota'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold text-lg">Mis mascotas</h1>
        <Button size="sm" onClick={openAdd}>
          + Agregar
        </Button>
      </div>

      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : pets.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-5xl mb-3">🐾</div>
            <p className="font-medium">No tenés mascotas registradas</p>
            <p className="text-sm mt-1">Agregá tu primera mascota para pedir servicios</p>
            <Button className="mt-4" onClick={openAdd}>
              Agregar mascota
            </Button>
          </div>
        ) : (
          pets.map((pet) => (
            <div
              key={pet.id}
              className="bg-card rounded-2xl p-4 border border-border"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                    🐕
                  </div>
                  <div>
                    <p className="font-bold">{pet.name}</p>
                    <p className="text-sm text-muted-foreground">{pet.breed}</p>
                    <p className="text-xs text-muted-foreground">
                      {pet.age} años · {pet.weight}kg · {SIZE_LABELS[pet.size]}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => openEdit(pet)}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(pet.id)}
                    className="text-xs text-destructive font-medium hover:underline"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              {pet.medicalNotes && (
                <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded-lg">
                  📋 {pet.medicalNotes}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      <BottomNav active="pets" />
    </div>
  )
}
