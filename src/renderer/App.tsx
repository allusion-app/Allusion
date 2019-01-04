import React from 'react';
import Sidebar from 'react-sidebar';

// The props that we expect to be passed into the component
interface IAppProps {}

// The state that is stored in this component
interface IAppState {
  isSidebarOpen: boolean;
  isSidebarDocked: boolean;
  allTags: string[];
}

class App extends React.Component<IAppProps, IAppState> {
  state = {
    isSidebarOpen: false,
    isSidebarDocked: false,
    allTags: ['Nature', 'Anatomy', 'Car'], // some pre-added tags as demo
  };

  setSidebarOpen = (open: boolean) => {
    this.setState({ isSidebarOpen: open });
  };
  toggleSidebarOpen = () => {
    this.setState({ isSidebarOpen: !this.state.isSidebarOpen });
  };
  toggleSidebarDocked = () => {
    this.setState({ isSidebarDocked: !this.state.isSidebarDocked });
  };

  removeTag = (tagIndex: number) => {
    const allTagsUpdated = this.state.allTags.filter(
      (_, index) => index !== tagIndex
    );
    this.setState({ allTags: allTagsUpdated });
  };
  addTag = (tag: string) => {
    this.setState({ allTags: [...this.state.allTags, tag] });
  };

  render() {
    const { isSidebarOpen, isSidebarDocked, allTags } = this.state;

    // Show a list of all tags in the sidebar
    const sidebarContent = (
      <>
        <h2>Tags:</h2>
        <ul>
          {allTags.map((tag, index) => (
            <li key={`tag-${index}`}>
              <button onClick={() => this.removeTag(index)}>x</button>
              <span onClick={() => alert(`You clicked '${tag}`)}>{tag}</span>
            </li>
          ))}
        </ul>
        <button onClick={() => this.addTag(`Tag ${allTags.length + 1}`)}>
          Add tag
        </button>
      </>
    );

    return (
      <>
        <Sidebar
          sidebar={sidebarContent}
          open={isSidebarOpen}
          docked={isSidebarDocked}
          onSetOpen={this.setSidebarOpen}
          sidebarClassName="sidebar"
          contentClassName="content">
          <button onClick={this.toggleSidebarOpen} disabled={isSidebarDocked}>
            Toggle sidebar
          </button>
          <button onClick={this.toggleSidebarDocked}>
            Toggle dock sidebar
          </button>

          <p>Here we can show a grid of images.</p>

          <img src="https://placekitten.com/480/640" />
        </Sidebar>
      </>
    );
  }
}

export default App;
