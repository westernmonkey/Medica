export const MODELS = [
  {
    slug: "brain",
    title: "Brain",
    src: "/models/new_brain.glb",
    tag: "Nervous system",
  },
  {
    slug: "heart",
    title: "Heart",
    src: "/models/human_heart.glb",
    tag: "Cardiac system",
  },
  {
    slug: "lungs",
    title: "Lungs",
    src: "/models/lungs.glb",
    tag: "Respiratory system",
  },
  {
    slug: "kidney",
    title: "Kidney",
    src: "/models/kidney.glb",
    tag: "Urinary system",
  },
  {
    slug: "stomach",
    title: "Stomach",
    src: "/models/stomach.glb",
    tag: "Digestive system",
  },
  {
    slug: "intestines",
    title: "Intestines",
    src: "/models/small_and_large_intestine.glb",
    tag: "Digestive system",
  },
  {
    slug: "spleen",
    title: "Spleen",
    src: "/models/spleen_model.glb",
    tag: "Lymphatic system",
  },
  {
    slug: "pancreas",
    title: "Pancreas",
    src: "/models/human_pancreas_cross_section.glb",
    tag: "Digestive system",
  },
  {
    slug: "eye",
    title: "Eye",
    src: "/models/realistic_human_eye.glb",
    tag: "Sensory system",
  },
  {
    slug: "skeleton",
    title: "Skeleton",
    src: "/models/skeleton.glb",
    tag: "Skeletal system",
  },
  {
    slug: "spine",
    title: "Spine",
    src: "/models/spine.glb",
    tag: "Skeletal system",
  },
] as const;

export type AnatomyModel = (typeof MODELS)[number];

export const TAGS = [
  "Nervous system",
  "Cardiac system",
  "Respiratory system",
  "Urinary system",
  "Digestive system",
  "Lymphatic system",
  "Sensory system",
  "Skeletal system",
] as const;

export function getModelBySlug(slug: string): AnatomyModel | undefined {
  return MODELS.find((model) => model.slug === slug);
}
