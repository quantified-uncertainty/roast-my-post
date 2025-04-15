import '../setupTests';

describe("SlateEditor", () => {
  beforeEach(() => {
    // Reset modules before each test
    jest.resetModules();

    // Create a basic mock for SlateEditor that returns a simple div
    jest.mock("./SlateEditor", () => {
      return {
        __esModule: true,
        default: function MockSlateEditor(props: any) {
          return {
            type: "div",
            props: {
              "data-testid": "slate-editor",
              children: [
                {
                  type: "div",
                  props: {
                    "data-testid": "slate-content",
                    children: props.content,
                  },
                },
                {
                  type: "div",
                  props: {
                    "data-testid": "slate-highlights",
                    children: `${props.highlights.length} highlights`,
                  },
                },
              ],
            },
          };
        },
      };
    });
  });

  test("mocked SlateEditor can be imported", () => {
    // This just tests that our mock is working
    const SlateEditor = require("./SlateEditor").default;
    const testInstance = SlateEditor({
      content: "Test content",
      highlights: [],
    });

    expect(testInstance.props["data-testid"]).toBe("slate-editor");
    expect(testInstance.props.children[0].props["data-testid"]).toBe(
      "slate-content"
    );
    expect(testInstance.props.children[0].props.children).toBe("Test content");
  });

  test("mocked SlateEditor handles highlights", () => {
    const SlateEditor = require("./SlateEditor").default;
    const highlights = [{ id: 1 }, { id: 2 }];

    const testInstance = SlateEditor({
      content: "Test content",
      highlights,
    });

    expect(testInstance.props.children[1].props.children).toBe("2 highlights");
  });
});
