import type {
  TypeComputedProps,
  TypeDataGridProps,
  TypeScrollProps,
} from "../../src/main";

const scrollProps = {
  autoHide: false,
  scrollThumbMargin: 2,
  scrollThumbWidth: 8,
  scrollThumbOverWidth: 12,
  scrollThumbRadius: 4,
  scrollTrackStyle: { opacity: 0.8 },
  scrollThumbStyle: { opacity: 0.9 },
} satisfies TypeScrollProps;

const props = {
  idProperty: "id",
  columns: [{ name: "id", width: 180 }],
  dataSource: [{ id: "row-1" }],
  nativeScroll: false,
  scrollProps,
  initialScrollTop: 120,
  initialScrollLeft: 80,
  rtl: true,
  onScroll: (event) => {
    void event.currentTarget.scrollTop;
  },
  onReady: (ref) => {
    const api: TypeComputedProps | null = ref.current;
    if (!api) return;

    api.scrollTop = 200;
    api.scrollLeft = 160;
    void api.scrollTop;
    void api.scrollLeft;
    api.setScrollTop?.(240);
    api.setScrollLeft?.(180);
    api.getVirtualList().smoothScrollTo(300, { duration: 100 }, () => {});
  },
} satisfies TypeDataGridProps;

void props;
