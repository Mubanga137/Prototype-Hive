import { FeaturedItem } from "@/components/FeaturedItemCard";

export interface SubcategoryDef {
  key: string;
  title: string;
  description: string;
  filterFn: (item: FeaturedItem) => boolean;
}

export const subcategoryDefinitions: Record<string, SubcategoryDef[]> = {
  tech: [
    {
      key: "smartphones",
      title: "Smartphones & Devices",
      description: "Latest phones, tablets & wearables",
      filterFn: (item) =>
        item.item_name.toLowerCase().includes("phone") ||
        item.item_name.toLowerCase().includes("iphone") ||
        item.item_name.toLowerCase().includes("tablet") ||
        item.item_name.toLowerCase().includes("watch"),
    },
    {
      key: "accessories",
      title: "Tech Accessories",
      description: "Cases, chargers, cables & more",
      filterFn: (item) =>
        item.item_name.toLowerCase().includes("case") ||
        item.item_name.toLowerCase().includes("cable") ||
        item.item_name.toLowerCase().includes("charger") ||
        item.item_name.toLowerCase().includes("hub") ||
        item.item_name.toLowerCase().includes("adapter"),
    },
    {
      key: "audio",
      title: "Audio & Speakers",
      description: "Headphones, speakers & audio gear",
      filterFn: (item) =>
        item.item_name.toLowerCase().includes("headset") ||
        item.item_name.toLowerCase().includes("speaker") ||
        item.item_name.toLowerCase().includes("earbuds") ||
        item.item_name.toLowerCase().includes("audio"),
    },
  ],
  fashion: [
    {
      key: "streetwear",
      title: "Streetwear & Casual",
      description: "Trendy sneakers, hoodies & casual fits",
      filterFn: (item) =>
        item.item_name.toLowerCase().includes("sneaker") ||
        item.item_name.toLowerCase().includes("hoodie") ||
        item.item_name.toLowerCase().includes("casual") ||
        item.item_name.toLowerCase().includes("urban"),
    },
    {
      key: "formal",
      title: "Formal & Elegant",
      description: "Blazers, dresses & formal attire",
      filterFn: (item) =>
        item.item_name.toLowerCase().includes("blazer") ||
        item.item_name.toLowerCase().includes("dress") ||
        item.item_name.toLowerCase().includes("formal") ||
        item.item_name.toLowerCase().includes("suit"),
    },
    {
      key: "accessories_fashion",
      title: "Fashion Accessories",
      description: "Bags, jewelry & style essentials",
      filterFn: (item) =>
        item.item_name.toLowerCase().includes("bag") ||
        item.item_name.toLowerCase().includes("jewelry") ||
        item.item_name.toLowerCase().includes("tote") ||
        item.item_name.toLowerCase().includes("accessory"),
    },
  ],
  food: [
    {
      key: "meals",
      title: "Complete Meals",
      description: "Prepared meals & main dishes",
      filterFn: (item) =>
        item.item_name.toLowerCase().includes("meal") ||
        item.item_name.toLowerCase().includes("box") ||
        item.item_name.toLowerCase().includes("dish"),
    },
    {
      key: "snacks",
      title: "Snacks & Quick Bites",
      description: "Pastries, nuts & bite-sized treats",
      filterFn: (item) =>
        item.item_name.toLowerCase().includes("snack") ||
        item.item_name.toLowerCase().includes("bites") ||
        item.item_name.toLowerCase().includes("quick"),
    },
    {
      key: "beverages",
      title: "Drinks & Beverages",
      description: "Coffee, juices & specialty drinks",
      filterFn: (item) =>
        item.item_name.toLowerCase().includes("coffee") ||
        item.item_name.toLowerCase().includes("juice") ||
        item.item_name.toLowerCase().includes("drink") ||
        item.item_name.toLowerCase().includes("tea"),
    },
  ],
  entertainment: [
    {
      key: "events",
      title: "Live Events & Shows",
      description: "Concerts, theater & live entertainment",
      filterFn: (item) =>
        item.item_name.toLowerCase().includes("event") ||
        item.item_name.toLowerCase().includes("show") ||
        item.item_name.toLowerCase().includes("concert") ||
        item.item_name.toLowerCase().includes("ticket"),
    },
    {
      key: "services",
      title: "Entertainment Services",
      description: "DJs, photographers & event services",
      filterFn: (item) =>
        item.item_type === "service" ||
        item.item_name.toLowerCase().includes("service") ||
        item.item_name.toLowerCase().includes("dj") ||
        item.item_name.toLowerCase().includes("booking"),
    },
    {
      key: "equipment",
      title: "Entertainment Gear",
      description: "Projectors, karaoke & media devices",
      filterFn: (item) =>
        item.item_name.toLowerCase().includes("projector") ||
        item.item_name.toLowerCase().includes("tv") ||
        item.item_name.toLowerCase().includes("karaoke") ||
        item.item_name.toLowerCase().includes("speaker"),
    },
  ],
  beauty: [
    {
      key: "skincare",
      title: "Skincare & Routines",
      description: "Cleansers, serums & treatments",
      filterFn: (item) =>
        item.item_name.toLowerCase().includes("skincare") ||
        item.item_name.toLowerCase().includes("butter") ||
        item.item_name.toLowerCase().includes("treatment") ||
        item.item_name.toLowerCase().includes("serum"),
    },
    {
      key: "makeup",
      title: "Makeup & Cosmetics",
      description: "Foundation, lipstick & makeup kits",
      filterFn: (item) =>
        item.item_name.toLowerCase().includes("makeup") ||
        item.item_name.toLowerCase().includes("lipstick") ||
        item.item_name.toLowerCase().includes("foundation"),
    },
    {
      key: "haircare",
      title: "Hair Care & Treatments",
      description: "Oils, shampoos & hair services",
      filterFn: (item) =>
        item.item_name.toLowerCase().includes("hair") ||
        item.item_name.toLowerCase().includes("oil") ||
        item.item_name.toLowerCase().includes("braiding"),
    },
  ],
};
